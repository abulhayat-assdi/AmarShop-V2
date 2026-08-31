import { and, eq, gte, isNull, isNotNull, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders } from "@/db/schema";
import { getSubscription } from "./subscription";
import { planLimit } from "./plans";

// Monthly ORDER quota (CLAUDE.md rule #3 — merchant-pays-AmarShop side).
// A store may RECEIVE up to its effective plan's `orders` limit per
// calendar month. Over that, a new order is still fully recorded but its
// `orders.quota_locked_at` is stamped — the merchant admin then sees only
// a count + code/date on /orders/locked until they upgrade. Unrelated to
// the customer's own view (/track), order-code allocation, or the
// order-placed SMS, which all keep working.

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka is UTC+6, no DST.

// The UTC instant of "first of this month, 00:00 Asia/Dhaka".
export function monthStartDhaka(now: Date = new Date()): Date {
  const dhaka = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(dhaka.getUTCFullYear(), dhaka.getUTCMonth(), 1) - DHAKA_OFFSET_MS);
}

// Pure — the lock rule, so it can be unit-tested.
export function isOverOrderQuota(monthCount: number, limit: number | null): boolean {
  return limit !== null && monthCount >= limit;
}

// The store's monthly order cap for its effective plan (null = unlimited).
export async function resolveOrderLimit(storeId: string): Promise<number | null> {
  const sub = await getSubscription(storeId);
  return planLimit(sub.effectivePlanId, "orders");
}

export type OrderQuotaView = {
  limit: number | null;
  usedThisMonth: number;
  remaining: number | null;
  lockedTotal: number;
};

export async function getOrderQuota(storeId: string): Promise<OrderQuotaView> {
  const limit = await resolveOrderLimit(storeId);
  const monthStart = monthStartDhaka();

  const { usedThisMonth, lockedTotal } = await withStoreContext(storeId, async (tx) => {
    const [used] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          gte(orders.createdAt, monthStart),
          isNull(orders.quotaLockedAt)
        )
      );
    const [locked] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), isNotNull(orders.quotaLockedAt)));
    return { usedThisMonth: used?.n ?? 0, lockedTotal: locked?.n ?? 0 };
  });

  return {
    limit,
    usedThisMonth,
    remaining: limit === null ? null : Math.max(0, limit - usedThisMonth),
    lockedTotal,
  };
}
