import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stores, type Store } from "@/db/schema";
import { STORE_STATUSES, SUBSCRIPTION_STATUSES } from "@/lib/enum-labels";
import { isValidPlanId, planPrice } from "@/lib/billing/plans";
import { getStoreStats } from "./stats";

// Monthly recurring revenue contribution of one store: only a paid,
// `active` subscription counts; a yearly sub is amortised to /12.
export function mrrForStore(row: {
  subscriptionPlan: string;
  subscriptionStatus: Store["subscriptionStatus"];
  subscriptionCycle: Store["subscriptionCycle"];
}): number {
  if (row.subscriptionStatus !== "active" || !isValidPlanId(row.subscriptionPlan)) return 0;
  return row.subscriptionCycle === "yearly"
    ? planPrice(row.subscriptionPlan, "yearly") / 12
    : planPrice(row.subscriptionPlan, "monthly");
}

export type PlatformOverview = {
  totalStores: number;
  liveStores: number;
  suspendedStores: number;
  paidSubscriptions: number;
  trialing: number;
  mrr: number;
  totalGmv: number;
  totalOrders: number;
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const rows = await db
    .select({
      status: stores.status,
      subscriptionPlan: stores.subscriptionPlan,
      subscriptionStatus: stores.subscriptionStatus,
      subscriptionCycle: stores.subscriptionCycle,
    })
    .from(stores);

  let liveStores = 0;
  let suspendedStores = 0;
  let paidSubscriptions = 0;
  let trialing = 0;
  let mrr = 0;
  for (const r of rows) {
    if (r.status === "active") liveStores += 1;
    if (r.status === "suspended") suspendedStores += 1;
    if (r.subscriptionStatus === "active") paidSubscriptions += 1;
    if (r.subscriptionStatus === "trialing") trialing += 1;
    mrr += mrrForStore(r);
  }

  let totalGmv = 0;
  let totalOrders = 0;
  for (const s of (await getStoreStats()).values()) {
    totalGmv += s.gmv;
    totalOrders += s.orderCount;
  }

  return {
    totalStores: rows.length,
    liveStores,
    suspendedStores,
    paidSubscriptions,
    trialing,
    mrr,
    totalGmv,
    totalOrders,
  };
}

export type PlatformStoreRow = {
  id: string;
  name: string;
  slug: string;
  status: Store["status"];
  subscriptionPlan: string;
  subscriptionStatus: Store["subscriptionStatus"];
  subscriptionCycle: Store["subscriptionCycle"];
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  customDomain: string | null;
  isDemo: boolean;
  createdAt: Date;
  orderCount: number;
  gmv: number;
  lastOrderAt: Date | null;
  ordersThisMonth: number;
  mrr: number;
};

export const PLATFORM_STORES_PAGE_SIZE = 25;

export async function listStores(opts: {
  page?: number;
  q?: string;
  status?: string;
  plan?: string;
  subStatus?: string;
}): Promise<{ rows: PlatformStoreRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = PLATFORM_STORES_PAGE_SIZE;

  const conds = [];
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q}%`;
    conds.push(or(ilike(stores.name, like), ilike(stores.slug, like)));
  }
  if (opts.status && (STORE_STATUSES as string[]).includes(opts.status)) {
    conds.push(eq(stores.status, opts.status as Store["status"]));
  }
  if (opts.plan && isValidPlanId(opts.plan)) {
    conds.push(eq(stores.subscriptionPlan, opts.plan));
  }
  if (opts.subStatus && (SUBSCRIPTION_STATUSES as string[]).includes(opts.subStatus)) {
    conds.push(eq(stores.subscriptionStatus, opts.subStatus as Store["subscriptionStatus"]));
  }
  const where = conds.length ? and(...conds) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(stores)
    .where(where);

  const base = await db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      status: stores.status,
      subscriptionPlan: stores.subscriptionPlan,
      subscriptionStatus: stores.subscriptionStatus,
      subscriptionCycle: stores.subscriptionCycle,
      trialEndsAt: stores.trialEndsAt,
      currentPeriodEndsAt: stores.currentPeriodEndsAt,
      customDomain: stores.customDomain,
      isDemo: stores.isDemo,
      createdAt: stores.createdAt,
    })
    .from(stores)
    .where(where)
    .orderBy(desc(stores.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const stats = await getStoreStats();
  const rows: PlatformStoreRow[] = base.map((r) => {
    const s = stats.get(r.id);
    return {
      ...r,
      orderCount: s?.orderCount ?? 0,
      gmv: s?.gmv ?? 0,
      lastOrderAt: s?.lastOrderAt ?? null,
      ordersThisMonth: s?.ordersThisMonth ?? 0,
      mrr: mrrForStore(r),
    };
  });

  return { rows, total, page, pageSize };
}
