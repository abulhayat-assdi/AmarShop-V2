import { and, eq, gte, sql } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import {
  carts,
  coupons,
  couponRedemptions,
  orders,
  orderItems,
  orderStatusEvents,
  payments,
  invoices,
  productVariants,
  type Order,
} from "@/db/schema";
import { allocateInvoiceNumber } from "@/lib/invoices/number";
import { allocateOrderCode } from "@/lib/orders/number";

export { BD_PHONE_PATTERN } from "@/lib/phone";

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
  // Already validated by the caller (evaluateCoupon). null = no coupon.
  // discountAmount folds in any free-delivery waiver, so
  // total === subtotal - discountAmount + deliveryCharge.
  discountAmount?: number;
  coupon?: { id: string; code: string } | null;
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
      orderCode: await allocateOrderCode(tx, params.storeId),
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerAddress: params.customerAddress,
      customerEmail: params.customerEmail,
      deliveryZoneId: params.deliveryZoneId,
      deliveryCharge: params.deliveryCharge.toFixed(2),
      subtotal: params.subtotal.toFixed(2),
      couponCode: params.coupon?.code ?? null,
      discountAmount: (params.discountAmount ?? 0).toFixed(2),
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
      // productName rides along so the caller can build a translated
      // message (src/app/(storefront)/checkout/actions.ts); the Error text
      // itself is for logs.
      throw Object.assign(new Error(`"${line.productName}" just sold out — please try again.`), {
        isOutOfStock: true,
        productName: line.productName,
      });
    }
  }

  // Coupon redemption — the same guarded-UPDATE trick as the stock
  // decrement above. Two concurrent orders racing the last use: only one
  // UPDATE matches `used_count < max_uses`, the other gets no row and
  // throws, rolling this whole transaction back. max_uses NULL = unlimited.
  if (params.coupon) {
    const [claimed] = await tx
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(coupons.id, params.coupon.id),
          eq(coupons.storeId, params.storeId),
          sql`(${coupons.maxUses} IS NULL OR ${coupons.usedCount} < ${coupons.maxUses})`
        )
      )
      .returning({ id: coupons.id });

    if (!claimed) {
      throw Object.assign(new Error(`Coupon "${params.coupon.code}" is fully used`), {
        isCouponExhausted: true,
      });
    }

    await tx.insert(couponRedemptions).values({
      storeId: params.storeId,
      couponId: params.coupon.id,
      orderId: order.id,
      customerPhone: params.customerPhone,
      discountAmount: (params.discountAmount ?? 0).toFixed(2),
    });
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
