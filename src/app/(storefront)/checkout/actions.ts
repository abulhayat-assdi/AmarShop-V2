"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCartToken } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import {
  carts,
  cartItems,
  productVariants,
  products,
  deliveryZones,
  orders,
  orderItems,
  orderStatusEvents,
  payments,
} from "@/db/schema";
import { getPaymentAdapter } from "@/lib/payments";

export type PlaceOrderField = "name" | "phone" | "address" | "deliveryZoneId";
export type PlaceOrderState = { error?: string; field?: PlaceOrderField };

const BD_PHONE_PATTERN = /^01[3-9]\d{8}$/;

type CartLine = {
  variantId: string;
  productName: string;
  sku: string;
  price: string;
  discountedPrice: string | null;
  quantity: number;
  available: number;
};

async function createOrderRecords(
  tx: Parameters<Parameters<typeof withStoreContext>[1]>[0],
  params: {
    storeId: string;
    cartId: string;
    items: CartLine[];
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
    tranId: string;
  }
) {
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

  for (const item of params.items) {
    const unitPrice = Number(item.discountedPrice ?? item.price);

    await tx.insert(orderItems).values({
      storeId: params.storeId,
      orderId: order.id,
      productVariantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      unitPrice: unitPrice.toFixed(2),
      quantity: item.quantity,
      lineTotal: (unitPrice * item.quantity).toFixed(2),
    });

    // Atomic, re-checked decrement — protects against a concurrent order
    // selling the last unit between this checkout's earlier stock check
    // and this exact write. If nothing matched, stock ran out in that
    // window; throwing here rolls back the whole order transaction.
    const [decremented] = await tx
      .update(productVariants)
      .set({ quantity: sql`${productVariants.quantity} - ${item.quantity}`, updatedAt: new Date() })
      .where(and(eq(productVariants.id, item.variantId), gte(productVariants.quantity, item.quantity)))
      .returning({ id: productVariants.id });

    if (!decremented) {
      throw Object.assign(new Error(`"${item.productName}" just sold out — please try again.`), {
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
    amount: params.total.toFixed(2),
    transactionId: params.tranId,
  });

  await tx
    .update(carts)
    .set({ status: "converted", updatedAt: new Date() })
    .where(eq(carts.id, params.cartId));

  return order;
}

export async function placeOrder(
  _prevState: PlaceOrderState,
  formData: FormData
): Promise<PlaceOrderState> {
  const store = await getCurrentStore();
  if (!store) {
    return { error: "Store not found." };
  }

  const customerName = String(formData.get("name") ?? "").trim();
  const customerPhone = String(formData.get("phone") ?? "").trim();
  const customerAddress = String(formData.get("address") ?? "").trim();
  const customerEmail = String(formData.get("email") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const deliveryZoneId = String(formData.get("deliveryZoneId") ?? "").trim();
  const paymentMethod: "cod" | "sslcommerz" =
    String(formData.get("paymentMethod") ?? "cod") === "sslcommerz" ? "sslcommerz" : "cod";

  if (!customerName) return { error: "Name is required.", field: "name" };
  if (!BD_PHONE_PATTERN.test(customerPhone)) {
    return { error: "Enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX).", field: "phone" };
  }
  if (!customerAddress) return { error: "Address is required.", field: "address" };
  if (!deliveryZoneId) return { error: "Select a delivery option.", field: "deliveryZoneId" };

  const token = await getCartToken();
  if (!token) {
    return { error: "Your cart is empty." };
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const tranId = randomUUID();

  let redirectTarget: string;

  try {
    const { cart, items, zone } = await withStoreContext(store.id, async (tx) => {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.storeId, store.id), eq(carts.cartToken, token)))
        .limit(1);
      if (!cart) {
        throw Object.assign(new Error("Cart not found"), { isEmpty: true });
      }

      const items: CartLine[] = await tx
        .select({
          variantId: productVariants.id,
          productName: products.name,
          sku: productVariants.sku,
          price: productVariants.price,
          discountedPrice: productVariants.discountedPrice,
          quantity: cartItems.quantity,
          available: productVariants.quantity,
        })
        .from(cartItems)
        .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(and(eq(cartItems.storeId, store.id), eq(cartItems.cartId, cart.id)));

      if (items.length === 0) {
        throw Object.assign(new Error("Cart is empty"), { isEmpty: true });
      }
      for (const item of items) {
        if (item.quantity > item.available) {
          throw Object.assign(
            new Error(`Only ${item.available} of "${item.productName}" left in stock.`),
            { isOutOfStock: true }
          );
        }
      }

      const [zone] = await tx
        .select()
        .from(deliveryZones)
        .where(and(eq(deliveryZones.storeId, store.id), eq(deliveryZones.id, deliveryZoneId)))
        .limit(1);
      if (!zone) {
        throw Object.assign(new Error("Invalid delivery zone"), { isInvalidZone: true });
      }

      return { cart, items, zone };
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.discountedPrice ?? item.price) * item.quantity,
      0
    );
    const deliveryCharge = Number(zone.charge);
    const total = subtotal + deliveryCharge;

    // External call BEFORE the order is written — see the plan's atomicity
    // note. tranId is generated up front so every callback URL (and the
    // payments.transactionId column) can reference it before the order
    // row exists.
    const adapter = getPaymentAdapter(paymentMethod);
    const initiation = await adapter.initiate({
      tranId,
      amount: total,
      customerName,
      customerPhone,
      customerAddress,
      customerEmail: customerEmail ?? undefined,
      deliveryZoneName: zone.name,
      successUrl: `${baseUrl}/order/${tranId}/confirmation`,
      failUrl: `${baseUrl}/checkout?error=payment_failed`,
      cancelUrl: `${baseUrl}/checkout?error=payment_canceled`,
    });

    await withStoreContext(store.id, (tx) =>
      createOrderRecords(tx, {
        storeId: store.id,
        cartId: cart.id,
        items,
        deliveryZoneId: zone.id,
        deliveryCharge,
        subtotal,
        total,
        customerName,
        customerPhone,
        customerAddress,
        customerEmail,
        notes,
        paymentMethod,
        tranId,
      })
    );

    redirectTarget =
      initiation.kind === "redirect" ? initiation.redirectUrl : `/order/${tranId}/confirmation`;
  } catch (err) {
    if ((err as { isEmpty?: boolean } | null)?.isEmpty) {
      return { error: "Your cart is empty." };
    }
    if ((err as { isOutOfStock?: boolean } | null)?.isOutOfStock) {
      return { error: (err as Error).message };
    }
    if ((err as { isInvalidZone?: boolean } | null)?.isInvalidZone) {
      return { error: "Invalid delivery zone selected.", field: "deliveryZoneId" };
    }
    if (err instanceof Error) {
      // Covers adapter.initiate() failures — e.g. SSLCommerz not configured
      // yet (src/lib/payments/sslcommerz.ts) — surfaced as-is since those
      // messages are already written to be customer-friendly.
      return { error: err.message };
    }
    throw err;
  }

  redirect(redirectTarget);
}
