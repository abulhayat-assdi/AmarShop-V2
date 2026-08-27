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
import { allocateInvoiceNumber, formatInvoiceNumber } from "./number";
import { renderInvoicePdf } from "./pdf";

// Never render a raw enum as a user-facing label (CLAUDE.md rule #7).
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  sslcommerz: "SSLCommerz",
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

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
    const filename = `${formatInvoiceNumber(invoice.number)}.pdf`;

    if (invoice.status === "generated" && invoice.storageKey) {
      const buffer = await storage.get(invoice.storageKey);
      return { buffer, filename };
    }

    const [store] = await tx
      .select({ name: stores.name })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

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
      invoiceNumber: formatInvoiceNumber(invoice.number),
      invoiceDate: invoice.createdAt,
      orderRef: `#${order.id.slice(0, 8)}`,
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
      deliveryCharge: order.deliveryCharge,
      deliveryZoneName: zone?.name ?? null,
      total: order.total,
      paymentMethodLabel:
        PAYMENT_METHOD_LABELS[payment?.method ?? order.paymentMethod] ??
        (payment?.method ?? order.paymentMethod),
      paymentStatusLabel: PAYMENT_STATUS_LABELS[payment?.status ?? "pending"] ?? "Payment pending",
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
