import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { carts, cartItems } from "@/db/schema";

const CART_COOKIE = "amarshop_cart_token";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Read-only — safe from Server Components (which can't set cookies during
// render). No token means no cart yet, full stop.
export async function getCartToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value;
}

// Only call from a Server Action / Route Handler, never a Server Component
// render — that's the only place Next.js allows setting cookies.
export async function getOrCreateCartToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const token = randomUUID();
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
  return token;
}

export async function getCart(storeId: string) {
  const token = await getCartToken();
  if (!token) return null;

  return withStoreContext(storeId, async (tx) => {
    const [cart] = await tx
      .select()
      .from(carts)
      .where(and(eq(carts.storeId, storeId), eq(carts.cartToken, token)))
      .limit(1);
    return cart ?? null;
  });
}

export async function getCartItemCount(storeId: string): Promise<number> {
  const cart = await getCart(storeId);
  if (!cart) return 0;

  const items = await withStoreContext(storeId, (tx) =>
    tx
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.storeId, storeId), eq(cartItems.cartId, cart.id)))
  );
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
