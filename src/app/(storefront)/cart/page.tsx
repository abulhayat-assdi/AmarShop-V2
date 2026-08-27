import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCart } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { cartItems, productVariants, products } from "@/db/schema";
import { updateCartItemQuantity, removeCartItem } from "./actions";

export default async function CartPage() {
  const store = await getCurrentStore();
  if (!store) notFound();

  const cart = await getCart(store.id);

  const items = cart
    ? await withStoreContext(store.id, (tx) =>
        tx
          .select({
            id: cartItems.id,
            quantity: cartItems.quantity,
            productSlug: products.slug,
            productName: products.name,
            price: productVariants.price,
            discountedPrice: productVariants.discountedPrice,
            available: productVariants.quantity,
          })
          .from(cartItems)
          .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
          .innerJoin(products, eq(products.id, productVariants.productId))
          .where(and(eq(cartItems.storeId, store.id), eq(cartItems.cartId, cart.id)))
      )
    : [];

  const subtotal = items.reduce((sum, item) => {
    const unitPrice = Number(item.discountedPrice ?? item.price);
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your Cart</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">Your cart is empty.</p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 border-b pb-4">
                <div className="flex flex-col gap-1">
                  <Link href={`/product/${item.productSlug}`} className="font-medium hover:underline">
                    {item.productName}
                  </Link>
                  <span className="text-sm text-gray-500">৳{item.discountedPrice ?? item.price} each</span>
                  {item.quantity >= item.available && (
                    <span className="text-xs text-amber-600">Only {item.available} in stock</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <form action={updateCartItemQuantity.bind(null, item.id, item.quantity - 1)}>
                    <button
                      type="submit"
                      className="rounded border px-2 py-1"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                  </form>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <form action={updateCartItemQuantity.bind(null, item.id, item.quantity + 1)}>
                    <button
                      type="submit"
                      disabled={item.quantity >= item.available}
                      className="rounded border px-2 py-1 disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </form>
                  <form action={removeCartItem.bind(null, item.id)}>
                    <button type="submit" className="ml-2 text-sm text-red-600 underline">
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Subtotal</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          <Link
            href="/checkout"
            className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            Proceed to Checkout
          </Link>
        </>
      )}
    </div>
  );
}
