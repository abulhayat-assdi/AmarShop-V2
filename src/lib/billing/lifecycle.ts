import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { PAST_DUE_GRACE_DAYS } from "./plans";

// Billing v2 lifecycle sweep (CLAUDE.md rule #3 — merchant-pays-AmarShop
// side). Idempotent: safe to run on any schedule, any number of times.
// Called by POST /api/internal/billing/tick (a docker-compose cron POSTs
// it hourly) and directly from tests. All three steps are plain `db`
// UPDATEs on `stores`, which sits outside the RLS boundary.

export type LifecycleResult = {
  trialsCanceled: number;
  markedPastDue: number;
  suspended: number;
};

export async function runBillingLifecycle(now: Date = new Date()): Promise<LifecycleResult> {
  const graceCutoff = new Date(now.getTime() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);

  // 1. Trial ended with no payment → canceled. The store keeps running on
  //    the free plan (effectivePlanId already returns "free").
  const canceled = await db
    .update(stores)
    .set({ subscriptionStatus: "canceled", updatedAt: now })
    .where(
      and(
        eq(stores.subscriptionStatus, "trialing"),
        isNotNull(stores.trialEndsAt),
        lt(stores.trialEndsAt, now)
      )
    )
    .returning({ id: stores.id });

  // 2. Paid period lapsed → past_due (banner shows; storefront still
  //    serves during the grace window).
  const pastDue = await db
    .update(stores)
    .set({ subscriptionStatus: "past_due", updatedAt: now })
    .where(
      and(
        eq(stores.subscriptionStatus, "active"),
        isNotNull(stores.currentPeriodEndsAt),
        lt(stores.currentPeriodEndsAt, now)
      )
    )
    .returning({ id: stores.id });

  // 3. Still past_due past the grace window → suspend the storefront. Only
  //    flips a currently-active store; never touches `pending`, never
  //    un-suspends (payment does that, via applyPaidPlan).
  const suspended = await db
    .update(stores)
    .set({ status: "suspended", updatedAt: now })
    .where(
      and(
        eq(stores.subscriptionStatus, "past_due"),
        eq(stores.status, "active"),
        isNotNull(stores.currentPeriodEndsAt),
        lt(stores.currentPeriodEndsAt, graceCutoff)
      )
    )
    .returning({ id: stores.id });

  return {
    trialsCanceled: canceled.length,
    markedPastDue: pastDue.length,
    suspended: suspended.length,
  };
}

// Pure helper for the /billing renewal banner and the merchant-admin bar.
export function renewalState(
  sub: { status: string; currentPeriodEndsAt: Date | null },
  now: Date = new Date()
): { isPastDue: boolean; renewsInDays: number | null } {
  if (sub.status === "past_due") return { isPastDue: true, renewsInDays: null };
  if (sub.status === "active" && sub.currentPeriodEndsAt) {
    const ms = sub.currentPeriodEndsAt.getTime() - now.getTime();
    return { isPastDue: false, renewsInDays: Math.ceil(ms / 86_400_000) };
  }
  return { isPastDue: false, renewsInDays: null };
}
