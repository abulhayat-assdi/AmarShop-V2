import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { withStoreContext, type TenantTx } from "@/db/context";
import { orders, platformInvoices, products, staffMembers, stores } from "@/db/schema";
import type { PlatformInvoice, Store } from "@/db/schema";
import {
  isValidPlanId,
  planPrice,
  TRIAL_PLAN,
  type BillingCycle,
  type PlanId,
} from "./plans";

// The merchant-pays-AmarShop billing module (CLAUDE.md rule #3). Every
// function here takes an explicit storeId and scopes with `where store_id
// = ?` — `stores` and `platform_invoices` both sit outside the
// app.current_store_id RLS boundary (see src/db/schema/platform-invoices.ts).
// The only place withStoreContext is used is getUsage(), which counts
// genuinely tenant-scoped tables (products, staff).

type SubscriptionRow = {
  subscriptionPlan: string;
  subscriptionStatus: Store["subscriptionStatus"];
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
};

// The plan whose limits actually apply to a store right now. Pure and
// exported so it can be unit-tested without a DB:
//   - a paid, unexpired subscription  → the committed plan
//   - inside the trial window         → TRIAL_PLAN (a courtesy upgrade)
//   - anything else (trial over, past_due, canceled) → "free"
export function effectivePlanId(row: SubscriptionRow, now: Date = new Date()): PlanId {
  if (
    row.subscriptionStatus === "active" &&
    row.currentPeriodEndsAt &&
    row.currentPeriodEndsAt > now
  ) {
    return isValidPlanId(row.subscriptionPlan) ? row.subscriptionPlan : "free";
  }
  if (row.subscriptionStatus === "trialing" && row.trialEndsAt && row.trialEndsAt > now) {
    return TRIAL_PLAN;
  }
  return "free";
}

export type SubscriptionView = {
  plan: string;
  status: Store["subscriptionStatus"];
  cycle: BillingCycle | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  effectivePlanId: PlanId;
  inTrial: boolean;
  trialDaysLeft: number;
};

export async function getSubscription(storeId: string): Promise<SubscriptionView> {
  const [row] = await db
    .select({
      subscriptionPlan: stores.subscriptionPlan,
      subscriptionStatus: stores.subscriptionStatus,
      subscriptionCycle: stores.subscriptionCycle,
      trialEndsAt: stores.trialEndsAt,
      currentPeriodEndsAt: stores.currentPeriodEndsAt,
    })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (!row) throw new Error(`store ${storeId} not found`);

  const now = new Date();
  const inTrial =
    row.subscriptionStatus === "trialing" && !!row.trialEndsAt && row.trialEndsAt > now;
  const trialDaysLeft = inTrial
    ? Math.ceil((row.trialEndsAt!.getTime() - now.getTime()) / 86_400_000)
    : 0;

  return {
    plan: row.subscriptionPlan,
    status: row.subscriptionStatus,
    cycle: row.subscriptionCycle,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEndsAt: row.currentPeriodEndsAt,
    effectivePlanId: effectivePlanId(row, now),
    inTrial,
    trialDaysLeft,
  };
}

export type PlanUsage = { products: number; staff: number };

// Real counts for the Billing page meters (CLAUDE.md rule #8 — a shown
// count is accurate or absent). products/staff ARE tenant-scoped, so this
// is the one function here that goes through withStoreContext.
export async function getUsage(storeId: string): Promise<PlanUsage> {
  return withStoreContext(storeId, async (tx) => {
    const [p] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.storeId, storeId));
    const [s] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(staffMembers)
      .where(eq(staffMembers.storeId, storeId));
    return { products: p?.n ?? 0, staff: s?.n ?? 0 };
  });
}

export function listPlatformInvoices(storeId: string): Promise<PlatformInvoice[]> {
  return db
    .select()
    .from(platformInvoices)
    .where(eq(platformInvoices.storeId, storeId))
    .orderBy(desc(platformInvoices.createdAt));
}

export async function getPendingInvoice(storeId: string): Promise<PlatformInvoice | null> {
  const [row] = await db
    .select()
    .from(platformInvoices)
    .where(and(eq(platformInvoices.storeId, storeId), eq(platformInvoices.status, "pending")))
    .orderBy(desc(platformInvoices.createdAt))
    .limit(1);
  return row ?? null;
}

function addPeriod(start: Date, cycle: BillingCycle): Date {
  const end = new Date(start);
  if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

// Merchant picks a plan → a fresh `pending` invoice for the next period.
// Any earlier still-pending invoice for this store is voided first, so a
// store never has more than one open invoice.
export async function createPlatformInvoice(
  storeId: string,
  planId: PlanId,
  cycle: BillingCycle
): Promise<PlatformInvoice> {
  if (!isValidPlanId(planId)) {
    throw new Error(`unknown plan ${planId}`);
  }
  const now = new Date();
  const periodEnd = addPeriod(now, cycle);
  const amount = planPrice(planId, cycle).toFixed(2);

  return db.transaction(async (tx) => {
    await tx
      .update(platformInvoices)
      .set({ status: "void", updatedAt: now })
      .where(and(eq(platformInvoices.storeId, storeId), eq(platformInvoices.status, "pending")));

    const [row] = await tx
      .insert(platformInvoices)
      .values({
        storeId,
        plan: planId,
        cycle,
        amount,
        status: "pending",
        periodStart: now,
        periodEnd,
      })
      .returning();
    return row;
  });
}

export type ManualPaymentReport = {
  walletProvider: NonNullable<PlatformInvoice["walletProvider"]>;
  senderMsisdn: string;
  senderReference: string;
};

// Merchant reports their bKash/Nagad transfer against a pending invoice.
// The invoice stays `pending` until a platform admin verifies it.
export async function submitInvoicePayment(
  storeId: string,
  invoiceId: string,
  report: ManualPaymentReport
): Promise<PlatformInvoice | null> {
  const [row] = await db
    .update(platformInvoices)
    .set({
      walletProvider: report.walletProvider,
      senderMsisdn: report.senderMsisdn,
      senderReference: report.senderReference,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(platformInvoices.id, invoiceId),
        eq(platformInvoices.storeId, storeId),
        eq(platformInvoices.status, "pending")
      )
    )
    .returning();
  return row ?? null;
}

// Put a store onto a paid plan: mark it active on `plan` until `periodEnd`,
// and unlock its entire quota-locked order backlog at once (a paying
// customer gets everything, even if the tier's monthly cap is below the
// backlog). The caller MUST have set app.current_store_id for `tx` — the
// stores update is RLS-exempt, but the orders unlock is not. Shared by
// markPlatformInvoicePaid (invoice verified) and the platform-admin
// subscription override (src/lib/platform/actions.ts).
export async function applyPaidPlan(
  tx: TenantTx,
  storeId: string,
  opts: { plan: string; cycle: BillingCycle; periodEnd: Date }
): Promise<void> {
  const now = new Date();
  await tx
    .update(stores)
    .set({
      subscriptionPlan: opts.plan,
      subscriptionStatus: "active",
      subscriptionCycle: opts.cycle,
      currentPeriodEndsAt: opts.periodEnd,
      updatedAt: now,
    })
    .where(eq(stores.id, storeId));
  await tx
    .update(orders)
    .set({ quotaLockedAt: null, updatedAt: now })
    .where(and(eq(orders.storeId, storeId), isNotNull(orders.quotaLockedAt)));
}

// Platform-admin path — NO storeId scope, this is the cross-tenant verify
// step. Marks the invoice paid and advances the store's subscription.
export async function markPlatformInvoicePaid(
  invoiceId: string,
  staffId: string | null
): Promise<PlatformInvoice | null> {
  return db.transaction(async (tx) => {
    const [inv] = await tx
      .select()
      .from(platformInvoices)
      .where(eq(platformInvoices.id, invoiceId))
      .limit(1);
    if (!inv || inv.status !== "pending") return null;

    // orders is RLS-scoped; platform_invoices / stores are not. Setting
    // the tenant GUC for this transaction lets applyPaidPlan's orders
    // unlock run, and is harmless to the two non-RLS updates.
    await tx.execute(sql`select set_config('app.current_store_id', ${inv.storeId}, true)`);

    await tx
      .update(platformInvoices)
      .set({ status: "paid", paidAt: new Date(), verifiedByStaffId: staffId, updatedAt: new Date() })
      .where(eq(platformInvoices.id, invoiceId));
    await applyPaidPlan(tx, inv.storeId, { plan: inv.plan, cycle: inv.cycle, periodEnd: inv.periodEnd });

    return inv;
  });
}

// Platform admin rejects a claimed payment (or cancels an unpaid selection).
export async function voidPlatformInvoice(invoiceId: string): Promise<void> {
  await db
    .update(platformInvoices)
    .set({ status: "void", updatedAt: new Date() })
    .where(and(eq(platformInvoices.id, invoiceId), eq(platformInvoices.status, "pending")));
}
