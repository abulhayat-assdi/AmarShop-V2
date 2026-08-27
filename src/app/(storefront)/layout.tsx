import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCartItemCount } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { StorefrontHeader, StorefrontFooter } from "@/components/storefront-chrome";
import { I18nProvider } from "@/components/i18n-provider";
import { getTranslator } from "@/lib/i18n/server";

// /category/* and /product/* only ever make sense on a resolved store host
// — proxy.ts already 404s an unresolved subdomain, but someone hitting
// these paths on the bare platform root still needs a defined result.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const store = await getCurrentStore();
  if (!store) {
    notFound();
  }

  const { locale, messages } = await getTranslator(store.locale);
  const categoryRows = await withStoreContext(store.id, (tx) =>
    tx.select().from(categories).where(eq(categories.storeId, store.id))
  );
  const cartItemCount = await getCartItemCount(store.id);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <StorefrontHeader store={store} categories={categoryRows} cartItemCount={cartItemCount} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
      <StorefrontFooter store={store} />
    </I18nProvider>
  );
}
