import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, payments, shipments, type Shipment } from "@/db/schema";
import { CourierApiError, createCourierAdapter } from "./index";
import { getActiveCourierConfig } from "./settings";
import type { CreateShipmentParams } from "./types";

const CLOSED_STATUSES = ["cancelled", "failed"] as const;

export async function getShipmentForOrder(
  storeId: string,
  orderId: string
): Promise<Shipment | null> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(shipments)
      .where(and(eq(shipments.storeId, storeId), eq(shipments.orderId, orderId)))
      .orderBy(desc(shipments.createdAt))
      .limit(1)
  );
  return row ?? null;
}

// Books the order with the store's active courier. Nothing is written
// until the courier responds: success → a `booked` row, failure → a
// `failed` row (with the reason) so the attempt is on record and the order
// can be re-booked.
export async function bookShipment(storeId: string, orderId: string): Promise<Shipment> {
  const active = await getActiveCourierConfig(storeId);
  if (!active) {
    throw new Error("No courier is set up yet — configure one in Courier Settings.");
  }

  const ctx = await withStoreContext(storeId, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)))
      .limit(1);
    if (!order) throw new Error("Order not found.");

    const [openShipment] = await tx
      .select({ id: shipments.id })
      .from(shipments)
      .where(
        and(
          eq(shipments.storeId, storeId),
          eq(shipments.orderId, orderId),
          notInArray(shipments.status, [...CLOSED_STATUSES])
        )
      )
      .limit(1);
    if (openShipment) throw new Error("This order already has a shipment.");

    const [payment] = await tx
      .select({ status: payments.status })
      .from(payments)
      .where(and(eq(payments.storeId, storeId), eq(payments.orderId, orderId)))
      .limit(1);

    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, orderId)));

    return { order, paymentStatus: payment?.status, itemCount: n };
  });

  const codAmount =
    ctx.order.paymentMethod === "cod" && ctx.paymentStatus !== "paid"
      ? Number(ctx.order.total)
      : 0;

  const params: CreateShipmentParams = {
    orderRef: ctx.order.id.slice(0, 8),
    recipientName: ctx.order.customerName,
    recipientPhone: ctx.order.customerPhone,
    recipientAddress: ctx.order.customerAddress,
    itemDescription: `${ctx.itemCount} item${ctx.itemCount === 1 ? "" : "s"}`,
    codAmount,
    notes: ctx.order.notes ?? undefined,
  };

  const snapshot = {
    storeId,
    orderId,
    provider: active.provider,
    codAmount: codAmount.toFixed(2),
    recipientName: params.recipientName,
    recipientPhone: params.recipientPhone,
    recipientAddress: params.recipientAddress,
  };

  const adapter = createCourierAdapter(active.provider, active.config);
  try {
    const result = await adapter.createShipment(params);
    const [row] = await withStoreContext(storeId, (tx) =>
      tx
        .insert(shipments)
        .values({
          ...snapshot,
          status: result.status,
          consignmentId: result.consignmentId,
          trackingCode: result.trackingCode,
          trackingUrl: result.trackingUrl,
          charge: result.charge != null ? result.charge.toFixed(2) : null,
          bookedAt: new Date(),
        })
        .returning()
    );
    return row;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    await withStoreContext(storeId, (tx) =>
      tx.insert(shipments).values({
        ...snapshot,
        status: "failed",
        failureReason: reason.slice(0, 500),
      })
    );
    throw err;
  }
}

export async function refreshShipmentStatus(
  storeId: string,
  shipmentId: string
): Promise<void> {
  const row = await withStoreContext(storeId, async (tx) => {
    const [s] = await tx
      .select()
      .from(shipments)
      .where(and(eq(shipments.storeId, storeId), eq(shipments.id, shipmentId)))
      .limit(1);
    return s ?? null;
  });
  if (!row) throw new Error("Shipment not found.");
  if (!row.consignmentId) throw new Error("This shipment was never booked with the courier.");

  const active = await getActiveCourierConfig(storeId);
  if (!active || active.provider !== row.provider) {
    throw new Error("The store's active courier no longer matches this shipment.");
  }

  const adapter = createCourierAdapter(row.provider, active.config);
  const tracking = await adapter.getTrackingStatus(row.consignmentId);

  await withStoreContext(storeId, (tx) =>
    tx
      .update(shipments)
      .set({ status: tracking.status, lastStatusRaw: tracking.rawStatus, updatedAt: new Date() })
      .where(and(eq(shipments.storeId, storeId), eq(shipments.id, shipmentId)))
  );
}

export async function cancelShipment(storeId: string, shipmentId: string): Promise<void> {
  const row = await withStoreContext(storeId, async (tx) => {
    const [s] = await tx
      .select()
      .from(shipments)
      .where(and(eq(shipments.storeId, storeId), eq(shipments.id, shipmentId)))
      .limit(1);
    return s ?? null;
  });
  if (!row) throw new Error("Shipment not found.");
  if (row.status !== "pending" && row.status !== "booked") {
    throw new Error("Only a pending or booked shipment can be cancelled.");
  }

  // Best-effort remote cancel — most BD couriers don't expose an API for
  // it, so a CourierApiError here is expected and non-fatal; the local
  // record is still marked cancelled so it stops tracking.
  const active = await getActiveCourierConfig(storeId);
  if (active && active.provider === row.provider && row.consignmentId) {
    try {
      await createCourierAdapter(row.provider, active.config).cancelShipment(row.consignmentId);
    } catch (err) {
      if (!(err instanceof CourierApiError)) throw err;
    }
  }

  await withStoreContext(storeId, (tx) =>
    tx
      .update(shipments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(shipments.storeId, storeId), eq(shipments.id, shipmentId)))
  );
}
