"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { orders, orderStatusEvents, payments } from "@/db/schema";
import { nextStatus } from "./status-pipeline";

// Bound with (orderId) from the detail page's buttons — see
// src/app/(admin)/orders/[id]/page.tsx. Guided one-step-at-a-time advance,
// not a free-form status dropdown (see the plan's design note).
export async function advanceOrderStatus(orderId: string) {
  const session = await requireStaffSession();

  await withStoreContext(session.user.storeId, async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.storeId, session.user.storeId), eq(orders.id, orderId)))
      .limit(1);
    if (!order) return;

    const next = nextStatus(order.status);
    if (!next) return;

    await tx
      .update(orders)
      .set({ status: next, updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await tx.insert(orderStatusEvents).values({
      storeId: session.user.storeId,
      orderId: order.id,
      status: next,
    });
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

export async function cancelOrder(orderId: string) {
  const session = await requireStaffSession();

  await withStoreContext(session.user.storeId, async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.storeId, session.user.storeId), eq(orders.id, orderId)))
      .limit(1);
    if (!order || order.status === "completed" || order.status === "canceled") return;

    await tx
      .update(orders)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await tx.insert(orderStatusEvents).values({
      storeId: session.user.storeId,
      orderId: order.id,
      status: "canceled",
    });
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

// A COD order's payment being collected doesn't always line up with any
// one status transition, so this is deliberately its own action — see the
// plan's design note.
export async function markPaymentReceived(orderId: string) {
  const session = await requireStaffSession();

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(payments)
      .set({ status: "paid", updatedAt: new Date() })
      .where(and(eq(payments.storeId, session.user.storeId), eq(payments.orderId, orderId)))
  );

  revalidatePath(`/orders/${orderId}`);
}
