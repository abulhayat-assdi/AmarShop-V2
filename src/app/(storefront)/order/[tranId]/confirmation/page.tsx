import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, payments } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { formatOrderCode } from "@/lib/orders/number";
import { getShipmentForOrder } from "@/lib/courier/shipments";
import {
  canReleaseDownloads,
  getOrderDigitalFiles,
  orderHasPhysicalLine,
} from "@/lib/products/digital";
import { StorefrontConversion } from "@/components/storefront-conversion";

// Reached from both COD's immediate redirect and SSLCommerz's success_url.
// Looked up by tranId (payments.transactionId), generated before the order
// existed — see src/app/(storefront)/checkout/actions.ts. Payment status
// shown here reflects whatever's on the payments row right now; for
// SSLCommerz that's still "pending" until its IPN listener (a later slice)
// confirms it — this page never claims a payment succeeded on the strength
// of the customer's browser landing here.
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ tranId: string }>;
}) {
  const { tranId } = await params;
  const store = await getCurrentStore();
  if (!store) notFound();

  const result = await withStoreContext(store.id, async (tx) => {
    const [payment] = await tx
      .select({
        orderId: payments.orderId,
        status: payments.status,
        method: payments.method,
        customerReference: payments.customerReference,
      })
      .from(payments)
      .where(and(eq(payments.storeId, store.id), eq(payments.transactionId, tranId)))
      .limit(1);
    if (!payment) return null;

    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, store.id), eq(orders.id, payment.orderId)))
      .limit(1);
    if (!order) return null;

    const items = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.storeId, store.id), eq(orderItems.orderId, order.id)));

    return { order, items, payment };
  });

  if (!result) notFound();
  const { order, items, payment } = result;
  const { t } = await getTranslator(store.locale);

  const digitalFiles = await getOrderDigitalFiles(store.id, order.id);
  const downloadsReleased =
    digitalFiles.length > 0 &&
    canReleaseDownloads(
      { id: order.id },
      payment,
      await orderHasPhysicalLine(store.id, order.id)
    );

  const shipment = await getShipmentForOrder(store.id, order.id);
  const trackingUrl =
    shipment && shipment.trackingUrl && shipment.status !== "cancelled" && shipment.status !== "failed"
      ? shipment.trackingUrl
      : null;

  const paymentLine =
    payment.method === "cod"
      ? t("confirmation.payOnDelivery")
      : payment.status === "paid"
        ? t("confirmation.paymentConfirmed")
        : payment.method === "manual_wallet"
          ? t("confirmation.payWalletPending")
          : t("confirmation.paymentPending");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {(store.metaPixelId || store.ga4MeasurementId) && (
        <StorefrontConversion
          analytics={{ metaPixelId: store.metaPixelId, ga4MeasurementId: store.ga4MeasurementId }}
          value={Number(order.total)}
          paid={payment.status === "paid"}
        />
      )}
      <h1 className="text-2xl font-semibold">
        {t("confirmation.thankYou", { name: order.customerName })}
      </h1>
      <p className="text-gray-600">
        {t("confirmation.placed")} {paymentLine}
      </p>
      {payment.method === "manual_wallet" && payment.customerReference && (
        <p className="text-sm text-gray-600">
          {t("confirmation.walletRef", { ref: payment.customerReference })}
        </p>
      )}
      <p className="text-sm">
        {t("confirmation.orderNumber", { number: formatOrderCode(order.orderCode) })}
      </p>

      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">{t("confirmation.orderSummary")}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>৳{item.lineTotal}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>{t("common.subtotal")}</span>
            <span>৳{order.subtotal}</span>
          </div>
          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between text-green-700">
              <span>
                {t("checkout.discount")}
                {order.couponCode ? ` (${order.couponCode})` : ""}
              </span>
              <span>−৳{order.discountAmount}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t("common.delivery")}</span>
            <span>৳{order.deliveryCharge}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>{t("common.total")}</span>
            <span>৳{order.total}</span>
          </div>
        </div>
      </div>

      {digitalFiles.length > 0 && (
        <div className="rounded border p-4">
          <h2 className="mb-2 font-semibold">{t("confirmation.downloads")}</h2>
          {downloadsReleased ? (
            <ul className="flex flex-col gap-1 text-sm">
              {digitalFiles.map((f) => (
                <li key={f.fileId}>
                  <a
                    href={`/order/${tranId}/download/${f.fileId}`}
                    className="underline"
                    rel="noopener"
                  >
                    {f.fileName}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">{t("confirmation.downloadPending")}</p>
          )}
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p>{t("confirmation.deliveringTo", { address: order.customerAddress })}</p>
        <p>{t("confirmation.phone", { phone: order.customerPhone })}</p>
      </div>

      <div className="flex flex-col gap-1">
        <a
          href={`/order/${tranId}/invoice`}
          target="_blank"
          rel="noopener"
          className="text-sm underline"
        >
          Download invoice (PDF)
        </a>
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            {t("confirmation.trackDelivery")}
          </a>
        )}
        <Link href="/track" className="text-sm underline">
          {t("confirmation.trackOrder")}
        </Link>
      </div>
    </div>
  );
}
