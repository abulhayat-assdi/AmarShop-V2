"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getOrCreateCartToken } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { carts, cartItems, productVariants, products } from "@/db/schema";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitReview } from "@/lib/reviews/mutate";

export type AddToCartState = { error?: MessageRef; notice?: MessageRef; ok?: boolean };

export async function addToCart(
  _prevState: AddToCartState,
  formData: FormData
): Promise<AddToCartState> {
  const store = await getCurrentStore();
  if (!store) {
    return { error: msg("pdp.errStore") };
  }

  const productVariantId = String(formData.get("productVariantId") ?? "");
  const requestedQuantity = Number(formData.get("quantity") ?? "1");

  if (!productVariantId || !Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
    return { error: msg("pdp.errQuantity") };
  }

  const token = await getOrCreateCartToken();

  try {
    const result = await withStoreContext(store.id, async (tx) => {
      const [variant] = await tx
        .select({
          id: productVariants.id,
          quantity: productVariants.quantity,
          isDigital: products.isDigital,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(and(eq(productVariants.storeId, store.id), eq(productVariants.id, productVariantId)))
        .limit(1);

      if (!variant) {
        throw Object.assign(new Error("Product not found"), { isNotFound: true });
      }

      let [cart] = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.storeId, store.id), eq(carts.cartToken, token)))
        .limit(1);

      if (!cart) {
        [cart] = await tx.insert(carts).values({ storeId: store.id, cartToken: token }).returning();
      }

      const [existingItem] = await tx
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productVariantId, productVariantId)))
        .limit(1);

      const desiredQuantity = (existingItem?.quantity ?? 0) + requestedQuantity;
      // Digital products have no stock — never cap them.
      const cappedQuantity = variant.isDigital
        ? desiredQuantity
        : Math.min(desiredQuantity, variant.quantity);

      if (existingItem) {
        await tx
          .update(cartItems)
          .set({ quantity: cappedQuantity, updatedAt: new Date() })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        await tx.insert(cartItems).values({
          storeId: store.id,
          cartId: cart.id,
          productVariantId,
          quantity: cappedQuantity,
        });
      }

      return { capped: cappedQuantity < desiredQuantity, available: variant.quantity };
    });

    revalidatePath("/", "layout");

    if (result.capped) {
      return { ok: true, notice: msg("pdp.noticeCapped", { count: result.available }) };
    }
    return { ok: true };
  } catch (err) {
    if ((err as { isNotFound?: boolean } | null)?.isNotFound) {
      return { error: msg("pdp.errNotFound") };
    }
    throw err;
  }
}

// ---- customer review submission (PDP -> Product Reviews moderation) ----

export type SubmitReviewState = { error?: MessageRef; ok?: boolean };
const HONEYPOT_FIELD = "_hp";

export async function submitReviewAction(
  _prev: SubmitReviewState,
  formData: FormData
): Promise<SubmitReviewState> {
  const store = await getCurrentStore();
  if (!store) return { error: msg("reviews.errStore") };

  // Silent drop for a bot fill (hidden field a human never sees).
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    return { ok: true };
  }

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const limit = await checkRateLimit(`review:${store.id}:${ip}`, {
    limit: 5,
    windowSeconds: 600,
  });
  if (!limit.ok) return { error: msg("reviews.errRateLimited") };

  const result = await submitReview(store.id, {
    productId: String(formData.get("productId") ?? ""),
    authorName: String(formData.get("authorName") ?? ""),
    rating: Number(formData.get("rating") ?? 0),
    body: String(formData.get("body") ?? ""),
  });
  if ("error" in result) return { error: msg(result.error) };

  return { ok: true };
}
