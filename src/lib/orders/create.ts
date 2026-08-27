import { and, eq, gte, sql } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import {
  carts,
  orders,
  orderItems,
  orderStatusEvents,
  payments,
  invoices,
  productVariants,
  type Order,
} from "@/db/schema";
import { allocateInvoiceNumber } from "@/lib/invoices/number";

export const BD_PHONE_PATTERN = /^01[3-9]\d{8}$/;

// One line of an order — the caller resolves the price (discountedPrice ??
// price) before handing it over. quantity is the number ordered.
export type OrderLine = {
  variantId: string;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
};

export type CreateOrderParams = {
  storeId: string;
  // Present for storefront checkout (the cart is marked converted); null
  // for a staff-entered manual order.
  cartId?: string | null;
  lines: OrderLine[];
  deliveryZoneId: string;
  deliveryCharge: number;
  subtotal: number;
  total: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string | null;
  notes: string | null;
  paymentMethod: "cod" | "sslcommerz";
  // Manual orders may be recorded as already paid (cash / bKash in person).
  paymentStatus?: "pending" | "paid";
  tranId: string;
};

// The single atomic order-creation transaction, shared by storefront
// checkout (src/app/(storefront)/checkout/actions.ts) and staff manual
// order entry (src/app/(admin)/orders/actions.ts). Must run inside a
// withStoreContext transaction — all-or-nothing: order + items + stock
// decrement + status event + payment + invoice row.
export async function createOrderRecords(
  tx: TenantTx,
  params: CreateOrderParams
): Promise<Order> {
  const [order] = await tx
    .insert(orders)
    .values({
      storeId: params.storeId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerAddress: params.customerAddress,
      customerEmail: params.customerEmail,
      deliveryZoneId: params.deliveryZoneId,
      deliveryCharge: params.deliveryCharge.toFixed(2),
      subtotal: params.subtotal.toFixed(2),
      total: params.total.toFixed(2),
      paymentMethod: params.paymentMethod,
      notes: params.notes,
    })
    .returning();

  for (const line of params.lines) {
    const unitPrice = Number(line.unitPrice);

    await tx.insert(orderItems).values({
      storeId: params.storeId,
      orderId: order.id,
      productVariantId: line.variantId,
      productName: line.productName,
      sku: line.sku,
      unitPrice: unitPrice.toFixed(2),
      quantity: line.quantity,
      lineTotal: (unitPrice * line.quantity).toFixed(2),
    });

    // Atomic, re-checked decrement — protects against a concurrent order
    // selling the last unit between an earlier stock check and this exact
    // write. If nothing matched, stock ran out in that window; throwing
    // here rolls back the whole order transaction.
    const [decremented] = await tx
      .update(productVariants)
      .set({ quantity: sql`${productVariants.quantity} - ${line.quantity}`, updatedAt: new Date() })
      .where(and(eq(productVariants.id, line.variantId), gte(productVariants.quantity, line.quantity)))
      .returning({ id: productVariants.id });

    if (!decremented) {
      throw Object.assign(new Error(`"${line.productName}" just sold out — please try again.`), {
        isOutOfStock: true,
      });
    }
  }

  await tx.insert(orderStatusEvents).values({
    storeId: params.storeId,
    orderId: order.id,
    status: "placed",
  });

  await tx.insert(payments).values({
    storeId: params.storeId,
    orderId: order.id,
    method: params.paymentMethod,
    status: params.paymentStatus ?? "pending",
    amount: params.total.toFixed(2),
    transactionId: params.tranId,
  });

  // Cheap "pending" row only — the PDF is rendered lazily on first download
  // (src/lib/invoices/service.ts), never in the request path.
  await tx.insert(invoices).values({
    storeId: params.storeId,
    orderId: order.id,
    number: await allocateInvoiceNumber(tx, params.storeId),
  });

  if (params.cartId) {
    await tx
      .update(carts)
      .set({ status: "converted", updatedAt: new Date() })
      .where(eq(carts.id, params.cartId));
  }

  return order;
}
