import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, orderStatusEvents, payments, deliveryZones } from "@/db/schema";
import { getShipmentForOrder } from "@/lib/courier/shipments";
import { getCourierSettingsView } from "@/lib/courier/settings";
import { getTranslator } from "@/lib/i18n/server";
import { advanceOrderStatus, cancelOrder, markPaymentReceived } from "../actions";
import { nextStatus } from "../status-pipeline";
import { formatOrderCode } from "@/lib/orders/number";
import { ORDER_STATUS_KEYS, PAYMENT_METHOD_KEYS, PAYMENT_STATUS_KEYS } from "@/lib/enum-labels";
import { ShipmentPanel } from "./ShipmentPanel";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaffSession();

  const result = await withStoreContext(session.user.storeId, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, session.user.storeId), eq(orders.id, id)))
      .limit(1);
    if (!order) return null;

    const items = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.storeId, session.user.storeId), eq(orderItems.orderId, id)));

    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.storeId, session.user.storeId), eq(payments.orderId, id)))
      .limit(1);

    const events = await tx
      .select()
      .from(orderStatusEvents)
      .where(and(eq(orderStatusEvents.storeId, session.user.storeId), eq(orderStatusEvents.orderId, id)))
      .orderBy(orderStatusEvents.createdAt);

    const [zone] = order.deliveryZoneId
      ? await tx
          .select()
          .from(deliveryZones)
          .where(and(eq(deliveryZones.storeId, session.user.storeId), eq(deliveryZones.id, order.deliveryZoneId)))
          .limit(1)
      : [];

    return { order, items, payment, events, zone };
  });

  if (!result) notFound();
  const { order, items, payment, events, zone } = result;
  const upcoming = nextStatus(order.status);

  const [shipment, courierView] = await Promise.all([
    getShipmentForOrder(session.user.storeId, order.id),
    getCourierSettingsView(session.user.storeId),
  ]);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {t("admin.orders.orderNo", { id: formatOrderCode(order.orderCode) })}
      </h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded border p-4">
          <h2 className="mb-2 font-semibold">{t("admin.orders.customer")}</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.customerEmail && <p>{order.customerEmail}</p>}
          <p className="text-gray-600">{order.customerAddress}</p>
        </div>
        <div className="rounded border p-4">
          <h2 className="mb-2 font-semibold">{t("admin.orders.delivery")}</h2>
          <p>{zone?.name ?? t("admin.common.none")}</p>
          <p>৳{order.deliveryCharge}</p>
          {order.notes && (
            <p className="mt-2 text-gray-600">{t("admin.orders.note", { note: order.notes })}</p>
          )}
        </div>
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">{t("admin.orders.items")}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.productName} × {item.quantity}{" "}
                <span className="text-gray-400">({item.sku})</span>
              </span>
              <span>৳{item.lineTotal}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>{t("admin.orders.subtotal")}</span>
            <span>৳{order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("admin.orders.deliveryCharge")}</span>
            <span>৳{order.deliveryCharge}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>{t("admin.orders.total")}</span>
            <span>৳{order.total}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded border p-4">
        <div>
          <p className="font-semibold">
            {t("admin.orders.payment", {
              method: t(PAYMENT_METHOD_KEYS[payment?.method ?? order.paymentMethod]),
            })}
          </p>
          <p className="text-sm text-gray-600">
            {t("admin.orders.paymentStatus", {
              status: payment?.status ? t(PAYMENT_STATUS_KEYS[payment.status]) : "—",
            })}
          </p>
          <a
            href={`/orders/${order.id}/invoice`}
            target="_blank"
            rel="noopener"
            className="text-sm underline"
          >
            {t("admin.orders.downloadInvoice")}
          </a>
        </div>
        {payment && payment.status !== "paid" && (
          <form action={markPaymentReceived.bind(null, order.id)}>
            <button type="submit" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
              {t("admin.orders.markPaymentReceived")}
            </button>
          </form>
        )}
      </div>

      <ShipmentPanel
        orderId={order.id}
        hasActiveCourier={courierView.activeProvider !== null}
        shipment={
          shipment
            ? {
                id: shipment.id,
                provider: shipment.provider,
                status: shipment.status,
                trackingCode: shipment.trackingCode,
                trackingUrl: shipment.trackingUrl,
                charge: shipment.charge,
                codAmount: shipment.codAmount,
                lastStatusRaw: shipment.lastStatusRaw,
                failureReason: shipment.failureReason,
              }
            : null
        }
      />

      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">
          {t("admin.orders.statusHeading", { status: t(ORDER_STATUS_KEYS[order.status]) })}
        </h2>
        {events.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1 text-sm text-gray-600">
            {events.map((event) => (
              <li key={event.id}>
                {new Date(event.createdAt).toLocaleString()} —{" "}
                {t(ORDER_STATUS_KEYS[event.status])}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          {upcoming && order.status !== "canceled" && (
            <form action={advanceOrderStatus.bind(null, order.id)}>
              <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                {t("admin.orders.markAs", { status: t(ORDER_STATUS_KEYS[upcoming]) })}
              </button>
            </form>
          )}
          {order.status !== "completed" && order.status !== "canceled" && (
            <form action={cancelOrder.bind(null, order.id)}>
              <button
                type="submit"
                className="rounded border border-red-400 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                {t("admin.orders.cancelOrder")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
