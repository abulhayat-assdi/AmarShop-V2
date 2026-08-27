"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getOrCreateCartToken } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { carts, cartItems, productVariants } from "@/db/schema";

export type AddToCartState = { error?: string; notice?: string; ok?: boolean };

export async function addToCart(
  _prevState: AddToCartState,
  formData: FormData
): Promise<AddToCartState> {
  const store = await getCurrentStore();
  if (!store) {
    return { error: "Store not found." };
  }

  const productVariantId = String(formData.get("productVariantId") ?? "");
  const requestedQuantity = Number(formData.get("quantity") ?? "1");

  if (!productVariantId || !Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
    return { error: "Invalid quantity." };
  }

  const token = await getOrCreateCartToken();

  try {
    const result = await withStoreContext(store.id, async (tx) => {
      const [variant] = await tx
        .select({ id: productVariants.id, quantity: productVariants.quantity })
        .from(productVariants)
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
      const cappedQuantity = Math.min(desiredQuantity, variant.quantity);

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
      return { ok: true, notice: `Only ${result.available} in stock — added as many as available.` };
    }
    return { ok: true };
  } catch (err) {
    if ((err as { isNotFound?: boolean } | null)?.isNotFound) {
      return { error: "Product not found." };
    }
    throw err;
  }
}
