import { and, eq, isNull, ne } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import { orders, orderStatusEvents, payments, type Order } from "@/db/schema";
import { nextOrderStatus } from "./status";

type OrderStatus = Order["status"];

// Shared order mutations, run INSIDE a caller-provided withStoreContext
// transaction. Both the admin Server Actions (src/app/(admin)/orders) and
// the /api/v1 write routes call these — one implementation, no fork. Each
// returns enough for the caller to fire the right after() side-effects
// (SMS, fraud, webhooks); none of them touch after() itself. Quota-locked
// orders are invisible to the merchant, so every helper ignores them.

// Advance an order one step along the pipeline. null = order missing,
// quota-locked, or already at the end / canceled.
export async function advanceOrderStatusTx(
  tx: TenantTx,
  storeId: string,
  orderId: string
): Promise<{ from: OrderStatus; to: OrderStatus } | null> {
  const [order] = await tx
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId), isNull(orders.quotaLockedAt)))
    .limit(1);
  if (!order) return null;
  const to = nextOrderStatus(order.status);
  if (!to) return null;

  await tx.update(orders).set({ status: to, updatedAt: new Date() }).where(eq(orders.id, order.id));
  await tx.insert(orderStatusEvents).values({ storeId, orderId: order.id, status: to });
  return { from: order.status, to };
}

// Cancel an order. null = missing, quota-locked, or already
// completed/canceled (nothing to do).
export async function cancelOrderTx(
  tx: TenantTx,
  storeId: string,
  orderId: string
): Promise<{ from: OrderStatus } | null> {
  const [order] = await tx
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId), isNull(orders.quotaLockedAt)))
    .limit(1);
  if (!order || order.status === "completed" || order.status === "canceled") return null;

  await tx
    .update(orders)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(orders.id, order.id));
  await tx.insert(orderStatusEvents).values({ storeId, orderId: order.id, status: "canceled" });
  return { from: order.status };
}

export type MarkPaidResult = "paid" | "noop" | "not_found";

// Flip an order's payment to paid. "not_found" = order missing or
// quota-locked; "noop" = no payment row, it was already paid, or a
// concurrent caller won the flip. Only a "paid" result should fire
// order.paid. Matches the old admin behaviour (any non-paid state ->
// paid), but reports whether THIS call did it.
export async function markOrderPaidTx(
  tx: TenantTx,
  storeId: string,
  orderId: string
): Promise<MarkPaidResult> {
  const [order] = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId), isNull(orders.quotaLockedAt)))
    .limit(1);
  if (!order) return "not_found";

  const flipped = await tx
    .update(payments)
    .set({ status: "paid", updatedAt: new Date() })
    .where(
      and(eq(payments.storeId, storeId), eq(payments.orderId, orderId), ne(payments.status, "paid"))
    )
    .returning({ id: payments.id });

  return flipped.length > 0 ? "paid" : "noop";
}
