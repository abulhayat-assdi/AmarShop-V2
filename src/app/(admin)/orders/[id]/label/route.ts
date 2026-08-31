import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, shipments, stores } from "@/db/schema";
import { COURIER_PROVIDER_LABELS } from "@/lib/courier/providers";
import { renderShipmentLabelPdf, type ShipmentLabelData } from "@/lib/courier/label";
import { formatOrderCode } from "@/lib/orders/number";

const CLOSED = ["failed", "cancelled"] as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaffSession();
  const { id } = await params;
  const storeId = session.user.storeId;

  const data = await withStoreContext(storeId, async (tx): Promise<ShipmentLabelData | null> => {
    const [shipment] = await tx
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.storeId, storeId),
          eq(shipments.orderId, id),
          notInArray(shipments.status, [...CLOSED])
        )
      )
      .orderBy(desc(shipments.createdAt))
      .limit(1);
    if (!shipment || !shipment.consignmentId) return null;

    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.id, id)))
      .limit(1);
    if (!order) return null;

    const [store] = await tx
      .select({ name: stores.name })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, id)));

    return {
      storeName: store?.name ?? "AmarShop",
      providerLabel: COURIER_PROVIDER_LABELS[shipment.provider],
      consignmentId: shipment.consignmentId,
      trackingCode: shipment.trackingCode,
      recipientName: order.customerName,
      recipientPhone: order.customerPhone,
      recipientAddress: order.customerAddress,
      codAmount: shipment.codAmount,
      itemCount: n,
      orderCode: formatOrderCode(order.orderCode),
    };
  });

  if (!data) return new Response("Not found", { status: 404 });

  const pdf = await renderShipmentLabelPdf(data);
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="label-${data.orderCode}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
