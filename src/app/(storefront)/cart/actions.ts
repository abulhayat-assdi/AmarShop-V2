"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCartToken } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { carts, cartItems, productVariants, products } from "@/db/schema";

// Resolves the caller's OWN cart from their cookie token. RLS already
// confines every query here to the current store, but it does NOT stop one
// visitor from passing another visitor's cartItemId within the same store
// — that check is this function's job.
async function requireOwnCart(storeId: string) {
  const token = await getCartToken();
  if (!token) {
    throw new Error("No cart");
  }
  return withStoreContext(storeId, async (tx) => {
    const [cart] = await tx
      .select()
      .from(carts)
      .where(and(eq(carts.storeId, storeId), eq(carts.cartToken, token)))
      .limit(1);
    if (!cart) throw new Error("No cart");
    return cart;
  });
}

// Bound with (cartItemId, quantity) from the cart page's +/- buttons — see
// src/app/(storefront)/cart/page.tsx. quantity <= 0 removes the item.
export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const store = await getCurrentStore();
  if (!store) return;
  const cart = await requireOwnCart(store.id);

  await withStoreContext(store.id, async (tx) => {
    const [item] = await tx
      .select({ id: cartItems.id, productVariantId: cartItems.productVariantId })
      .from(cartItems)
      .where(and(eq(cartItems.id, cartItemId), eq(cartItems.cartId, cart.id)))
      .limit(1);
    if (!item) return;

    if (quantity <= 0) {
      await tx.delete(cartItems).where(eq(cartItems.id, item.id));
      return;
    }

    const [variant] = await tx
      .select({ quantity: productVariants.quantity, isDigital: products.isDigital })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(productVariants.id, item.productVariantId))
      .limit(1);

    const cappedQuantity = variant?.isDigital
      ? quantity
      : Math.min(quantity, variant?.quantity ?? quantity);

    await tx
      .update(cartItems)
      .set({ quantity: cappedQuantity, updatedAt: new Date() })
      .where(eq(cartItems.id, item.id));
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItem(cartItemId: string) {
  const store = await getCurrentStore();
  if (!store) return;
  const cart = await requireOwnCart(store.id);

  await withStoreContext(store.id, (tx) =>
    tx.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.cartId, cart.id)))
  );

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
