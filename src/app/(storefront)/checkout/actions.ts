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
import { evaluateCoupon } from "@/lib/coupons/validate";
import { checkRateLimit } from "@/lib/rate-limit";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

export type PlaceOrderField = "name" | "phone" | "address" | "deliveryZoneId" | "couponCode";
export type PlaceOrderState = { error?: MessageRef; field?: PlaceOrderField };

// Preview only — placeOrder re-evaluates authoritatively. This just lets
// the customer see the discount before committing. Rate-limited because
// guessing valid codes is a brute-force target (same treatment as /track).
export type ApplyCouponState = {
  error?: MessageRef;
  applied?: { code: string; discountAmount: number; freeDelivery: boolean };
};

export async function applyCouponAction(
  _prev: ApplyCouponState,
  formData: FormData
): Promise<ApplyCouponState> {
  const store = await getCurrentStore();
  if (!store) return { error: msg("checkout.errStore") };

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const limit = await checkRateLimit(`coupon:ip:${store.id}:${ip}`, { limit: 12, windowSeconds: 300 });
  if (!limit.ok) return { error: msg("coupon.errRateLimited") };

  const code = String(formData.get("code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const token = await getCartToken();
  if (!token) return { error: msg("checkout.errEmptyCart") };

  const zoneId = String(formData.get("deliveryZoneId") ?? "").trim();

  const result = await withStoreContext(store.id, async (tx) => {
    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.storeId, store.id), eq(carts.cartToken, token)))
      .limit(1);
    if (!cart) return { error: msg("checkout.errEmptyCart") } as ApplyCouponState;

    const rows = await tx
      .select({
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
      .where(and(eq(cartItems.storeId, store.id), eq(cartItems.cartId, cart.id)));
    if (rows.length === 0) return { error: msg("checkout.errEmptyCart") } as ApplyCouponState;

    const subtotal = rows.reduce(
      (sum, r) => sum + Number(r.discountedPrice ?? r.price) * r.quantity,
      0
    );

    const [zone] = zoneId
      ? await tx
          .select({ charge: deliveryZones.charge })
          .from(deliveryZones)
          .where(and(eq(deliveryZones.storeId, store.id), eq(deliveryZones.id, zoneId)))
          .limit(1)
      : [];
    const deliveryCharge = zone ? Number(zone.charge) : 0;

    const evaluation = await evaluateCoupon(tx, {
      storeId: store.id,
      code,
      subtotal,
      deliveryCharge,
      phone: BD_PHONE_PATTERN.test(phone) ? phone : null,
    });
    if (!evaluation.ok) return { error: evaluation.reason } as ApplyCouponState;

    return {
      applied: {
        code: evaluation.coupon.code,
        discountAmount: evaluation.discountAmount,
        freeDelivery: evaluation.freeDelivery,
      },
    } as ApplyCouponState;
  });

  return result;
}

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
  const couponCode = String(formData.get("couponCode") ?? "").trim();
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
    const { cart, items, zone, coupon } = await withStoreContext(store.id, async (tx) => {
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

      // Coupon judged here, in the read tx, so its discount is baked into
      // `total` before adapter.initiate() sees the amount — the IPN later
      // checks that amount against payments.amount. The used_count guard
      // itself runs in the write tx (createOrderRecords).
      let coupon: { code: string; id: string; discountAmount: number } | null = null;
      if (couponCode) {
        const subtotal = items.reduce(
          (sum, item) => sum + Number(item.discountedPrice ?? item.price) * item.quantity,
          0
        );
        const evaluation = await evaluateCoupon(tx, {
          storeId: store.id,
          code: couponCode,
          subtotal,
          deliveryCharge: Number(zone.charge),
          phone: customerPhone,
        });
        if (!evaluation.ok) {
          throw Object.assign(new Error("Coupon rejected"), {
            isCouponInvalid: true,
            reason: evaluation.reason,
          });
        }
        coupon = {
          code: evaluation.coupon.code,
          id: evaluation.coupon.id,
          discountAmount: evaluation.discountAmount,
        };
      }

      return { cart, items, zone, coupon };
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
    const discountAmount = coupon?.discountAmount ?? 0;
    // discountAmount already folds in a free-delivery waiver, so this
    // identity holds for every coupon type.
    const total = Math.round((subtotal - discountAmount + deliveryCharge) * 100) / 100;

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
        discountAmount,
        total,
        coupon: coupon ? { id: coupon.id, code: coupon.code } : null,
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
    if ((err as { isCouponInvalid?: boolean } | null)?.isCouponInvalid) {
      return { error: (err as { reason: MessageRef }).reason, field: "couponCode" };
    }
    if ((err as { isCouponExhausted?: boolean } | null)?.isCouponExhausted) {
      return { error: msg("coupon.errExhausted"), field: "couponCode" };
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
