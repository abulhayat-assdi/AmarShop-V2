import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, payments } from "@/db/schema";
import type { Order, Payment } from "@/db/schema";
import { getShipmentForOrder } from "@/lib/courier/shipments";
import {
  canReleaseDownloads,
  getOrderDigitalFiles,
  orderHasPhysicalLine,
} from "@/lib/products/digital";

export type OrderStatus = Order["status"];

export type TrackedOrderItem = { name: string; quantity: number; lineTotal: string };

export type TrackedOrderView = {
  orderCode: string;
  status: OrderStatus;
  placedAt: string; // ISO
  items: TrackedOrderItem[];
  subtotal: string;
  couponCode: string | null;
  discountAmount: string;
  deliveryCharge: string;
  total: string;
  paymentMethod: Order["paymentMethod"];
  paymentStatus: Payment["status"];
  customerName: string;
  address: string;
  shipment: { status: string; trackingUrl: string | null } | null;
  downloads: { fileName: string; href: string }[];
  // digital files exist on this order but aren't released yet.
  digitalPending: boolean;
};

// The public /track lookup: a store's order by its per-store number, gated
// by a matching customer phone. Any mismatch (unknown number, wrong phone,
// another store's order) returns null — the caller must not tell the two
// apart. RLS-scoped via withStoreContext.
export async function findTrackedOrder(
  storeId: string,
  input: { orderCode: string; phone: string }
): Promise<TrackedOrderView | null> {
  const found = await withStoreContext(storeId, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.orderCode, input.orderCode)))
      .limit(1);
    if (!order || order.customerPhone !== input.phone) return null;

    const items = await tx
      .select({
        name: orderItems.productName,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .where(and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, order.id)));

    const [payment] = await tx
      .select({ status: payments.status, transactionId: payments.transactionId })
      .from(payments)
      .where(and(eq(payments.storeId, storeId), eq(payments.orderId, order.id)))
      .limit(1);

    return {
      order,
      items,
      paymentStatus: payment?.status ?? "pending",
      tranId: payment?.transactionId ?? null,
    };
  });

  if (!found) return null;

  const shipment = await getShipmentForOrder(storeId, found.order.id);
  const digitalFiles = await getOrderDigitalFiles(storeId, found.order.id);
  const downloadsReleased =
    digitalFiles.length > 0 &&
    canReleaseDownloads(
      { id: found.order.id },
      { status: found.paymentStatus },
      await orderHasPhysicalLine(storeId, found.order.id)
    );

  return {
    orderCode: found.order.orderCode,
    status: found.order.status,
    placedAt: found.order.createdAt.toISOString(),
    items: found.items,
    subtotal: found.order.subtotal,
    couponCode: found.order.couponCode,
    discountAmount: found.order.discountAmount,
    deliveryCharge: found.order.deliveryCharge,
    total: found.order.total,
    paymentMethod: found.order.paymentMethod,
    paymentStatus: found.paymentStatus,
    customerName: found.order.customerName,
    address: found.order.customerAddress,
    shipment:
      shipment && shipment.status !== "cancelled" && shipment.status !== "failed"
        ? { status: shipment.status, trackingUrl: shipment.trackingUrl }
        : null,
    downloads:
      found.tranId && downloadsReleased
        ? digitalFiles.map((f) => ({
            fileName: f.fileName,
            href: `/order/${found.tranId}/download/${f.fileId}`,
          }))
        : [],
    digitalPending: digitalFiles.length > 0 && !downloadsReleased,
  };
}
