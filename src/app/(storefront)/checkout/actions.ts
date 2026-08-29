"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCartToken } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { carts, cartItems, productVariants, products, deliveryZones } from "@/db/schema";
import { getPaymentAdapter } from "@/lib/payments";
import { getSslcommerzConfig } from "@/lib/payments/settings";
import { BD_PHONE_PATTERN, createOrderRecords, type OrderLine } from "@/lib/orders/create";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

export type PlaceOrderField = "name" | "phone" | "address" | "deliveryZoneId";
export type PlaceOrderState = { error?: MessageRef; field?: PlaceOrderField };

type CartLine = {
  variantId: string;
  productName: string;
  sku: string;
  price: string;
  discountedPrice: string | null;
  quantity: number;
  available: number;
};

export async function placeOrder(
  _prevState: PlaceOrderState,
  formData: FormData
): Promise<PlaceOrderState> {
  const store = await getCurrentStore();
  if (!store) {
    return { error: msg("checkout.errStore") };
  }

  const customerName = String(formData.get("name") ?? "").trim();
  const customerPhone = String(formData.get("phone") ?? "").trim();
  const customerAddress = String(formData.get("address") ?? "").trim();
  const customerEmail = String(formData.get("email") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const deliveryZoneId = String(formData.get("deliveryZoneId") ?? "").trim();
  const paymentMethod: "cod" | "sslcommerz" =
    String(formData.get("paymentMethod") ?? "cod") === "sslcommerz" ? "sslcommerz" : "cod";

  if (!customerName) return { error: msg("checkout.errName"), field: "name" };
  if (!BD_PHONE_PATTERN.test(customerPhone)) {
    return { error: msg("checkout.errPhone"), field: "phone" };
  }
  if (!customerAddress) return { error: msg("checkout.errAddress"), field: "address" };
  if (!deliveryZoneId) return { error: msg("checkout.errZone"), field: "deliveryZoneId" };

  const token = await getCartToken();
  if (!token) {
    return { error: msg("checkout.errEmptyCart") };
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
            { isOutOfStock: true, productName: item.productName, available: item.available }
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

    const lines: OrderLine[] = items.map((item) => ({
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      unitPrice: String(item.discountedPrice ?? item.price),
      quantity: item.quantity,
    }));

    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.unitPrice) * line.quantity,
      0
    );
    const deliveryCharge = Number(zone.charge);
    const total = subtotal + deliveryCharge;

    // External call BEFORE the order is written — see the plan's atomicity
    // note. tranId is generated up front so every callback URL (and the
    // payments.transactionId column) can reference it before the order
    // row exists.
    const sslConfig =
      paymentMethod === "sslcommerz" ? await getSslcommerzConfig(store.id) : null;
    const adapter = getPaymentAdapter(paymentMethod, sslConfig);
    const initiation = await adapter.initiate({
      tranId,
      amount: total,
      customerName,
      customerPhone,
      customerAddress,
      customerEmail: customerEmail ?? undefined,
      deliveryZoneName: zone.name,
      storeId: store.id,
      // On the store's own host so the handlers can resolve the store via
      // getCurrentStore(); value_a carries the store id as a fallback.
      ipnUrl: `${baseUrl}/api/payments/sslcommerz/ipn`,
      returnUrl: `${baseUrl}/api/payments/sslcommerz/return`,
      failUrl: `${baseUrl}/checkout?error=payment_failed`,
      cancelUrl: `${baseUrl}/checkout?error=payment_canceled`,
    });

    await withStoreContext(store.id, (tx) =>
      createOrderRecords(tx, {
        storeId: store.id,
        cartId: cart.id,
        lines,
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
      return { error: msg("checkout.errEmptyCart") };
    }
    if ((err as { isOutOfStock?: boolean } | null)?.isOutOfStock) {
      const e = err as { productName?: string; available?: number };
      return {
        error:
          e.available === undefined
            ? msg("checkout.errSoldOut", { name: e.productName ?? "" })
            : msg("checkout.errStockLeft", { count: e.available, name: e.productName ?? "" }),
      };
    }
    if ((err as { isInvalidZone?: boolean } | null)?.isInvalidZone) {
      return { error: msg("checkout.errZoneInvalid"), field: "deliveryZoneId" };
    }
    if (err instanceof Error) {
      // Covers adapter.initiate() failures — e.g. the gateway being down or
      // not configured for this store (src/lib/payments/sslcommerz.ts).
      // Those messages are already written for customers, but they're
      // English-only, so they ride in as a var on a passthrough key.
      console.error("[checkout] payment initiation failed", err);
      return { error: msg("checkout.errPayment", { detail: err.message }) };
    }
    throw err;
  }

  redirect(redirectTarget);
}
