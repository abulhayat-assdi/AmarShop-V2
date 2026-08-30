import { and, eq } from "drizzle-orm";
import { withStoreContext, type TenantTx } from "@/db/context";
import {
  invoices,
  orders,
  orderItems,
  payments,
  deliveryZones,
  stores,
} from "@/db/schema";
import { getStorageAdapter } from "@/lib/storage";
import { PAYMENT_METHOD_KEYS, PAYMENT_STATUS_KEYS } from "@/lib/enum-labels";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { messagesFor } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translate";
import { formatOrderCode } from "@/lib/orders/number";
import { allocateInvoiceNumber } from "./number";
import { renderInvoicePdf } from "./pdf";

function storageKeyFor(storeId: string, invoiceId: string): string {
  return `invoices/${storeId}/${invoiceId}.pdf`;
}

// Returns the invoice row for an order, creating a "pending" one if absent.
// Safe to call for orders created before the invoices table existed. Must
// run inside a withStoreContext transaction.
export async function getOrCreateInvoice(tx: TenantTx, storeId: string, orderId: string) {
  const [existing] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.storeId, storeId), eq(invoices.orderId, orderId)))
    .limit(1);
  if (existing) return existing;

  const number = await allocateInvoiceNumber(tx, storeId);
  await tx
    .insert(invoices)
    .values({ storeId, orderId, number })
    .onConflictDoNothing({ target: invoices.orderId });

  const [row] = await tx
    .select()
    .from(invoices)
    .where(and(eq(invoices.storeId, storeId), eq(invoices.orderId, orderId)))
    .limit(1);
  return row;
}

export type InvoicePdfResult = { buffer: Buffer; filename: string };

// Entry point for both download routes. Resolves (and lazily creates) the
// invoice for an order, renders + stores the PDF on first request, and
// serves the stored copy thereafter. Returns null if the order does not
// belong to this store (RLS + the explicit store_id filter both enforce it).
export async function getInvoicePdf(
  storeId: string,
  orderId: string
): Promise<InvoicePdfResult | null> {
  const storage = getStorageAdapter();

  return withStoreContext(storeId, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)))
      .limit(1);
    if (!order) return null;

    const invoice = await getOrCreateInvoice(tx, storeId, orderId);
    const filename = `${formatOrderCode(order.orderCode)}.pdf`;

    if (invoice.status === "generated" && invoice.storageKey) {
      const buffer = await storage.get(invoice.storageKey);
      return { buffer, filename };
    }

    const [store] = await tx
      .select({ name: stores.name, locale: stores.locale })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    // The PDF has no request context, so it renders in the store's own
    // locale, reading the same label keys the admin screens use.
    const t = createTranslator(
      messagesFor(isLocale(store?.locale) ? store.locale : DEFAULT_LOCALE)
    );

    const items = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, orderId)));

    const [payment] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.storeId, storeId), eq(payments.orderId, orderId)))
      .limit(1);

    const [zone] = order.deliveryZoneId
      ? await tx
          .select({ name: deliveryZones.name })
          .from(deliveryZones)
          .where(
            and(
              eq(deliveryZones.storeId, storeId),
              eq(deliveryZones.id, order.deliveryZoneId)
            )
          )
          .limit(1)
      : [];

    const buffer = await renderInvoicePdf({
      storeName: store?.name ?? "AmarShop",
      invoiceDate: invoice.createdAt,
      orderRef: formatOrderCode(order.orderCode),
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        address: order.customerAddress,
      },
      items: items.map((it) => ({
        name: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
      })),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      discountLabel:
        Number(order.discountAmount) > 0
          ? order.couponCode
            ? `${t("checkout.discount")} (${order.couponCode})`
            : t("checkout.discount")
          : null,
      deliveryCharge: order.deliveryCharge,
      deliveryZoneName: zone?.name ?? null,
      total: order.total,
      paymentMethodLabel: t(PAYMENT_METHOD_KEYS[payment?.method ?? order.paymentMethod]),
      paymentStatusLabel: t(PAYMENT_STATUS_KEYS[payment?.status ?? "pending"]),
    });

    const key = storageKeyFor(storeId, invoice.id);
    await storage.put(key, buffer, "application/pdf");
    await tx
      .update(invoices)
      .set({
        status: "generated",
        storageKey: key,
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.storeId, storeId), eq(invoices.id, invoice.id)));

    return { buffer, filename };
  });
}
