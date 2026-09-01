import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCart } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { cartItems, productVariants, products, deliveryZones } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { getManualWalletConfig } from "@/lib/payments/settings";
import { listActiveCheckoutFields } from "@/lib/checkout-fields/query";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const store = await getCurrentStore();
  if (!store) notFound();

  const cart = await getCart(store.id);

  const items = cart
    ? await withStoreContext(store.id, (tx) =>
        tx
          .select({
            id: cartItems.id,
            quantity: cartItems.quantity,
            productName: products.name,
            isDigital: products.isDigital,
            price: productVariants.price,
            discountedPrice: productVariants.discountedPrice,
          })
          .from(cartItems)
          .innerJoin(productVariants, eq(productVariants.id, cartItems.productVariantId))
          .innerJoin(products, eq(products.id, productVariants.productId))
          .where(and(eq(cartItems.storeId, store.id), eq(cartItems.cartId, cart.id)))
      )
    : [];

  if (items.length === 0) {
    redirect("/cart");
  }

  const digitalOnly = items.every((item) => item.isDigital);

  const zones = digitalOnly
    ? []
    : await withStoreContext(store.id, (tx) =>
        tx.select().from(deliveryZones).where(eq(deliveryZones.storeId, store.id))
      );

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.discountedPrice ?? item.price) * item.quantity,
    0
  );
  const manualWallet = await getManualWalletConfig(store.id);
  const customFields = await listActiveCheckoutFields(store.id);
  const { t } = await getTranslator(store.locale);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("checkout.title")}</h1>
      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">{t("checkout.orderSummary")}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>৳{(Number(item.discountedPrice ?? item.price) * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
      <CheckoutForm
        subtotal={subtotal}
        zones={zones}
        manualWallet={manualWallet}
        digitalOnly={digitalOnly}
        customFields={customFields}
      />
    </div>
  );
}
