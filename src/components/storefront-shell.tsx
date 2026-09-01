import { eq } from "drizzle-orm";
import type { Store } from "@/db/schema";
import { categories } from "@/db/schema";
import { withStoreContext } from "@/db/context";
import { getCartItemCount } from "@/lib/cart";
import { getStorefrontChrome } from "@/lib/cms/queries";
import { getActiveMenuLinks } from "@/lib/menus/query";
import { getTranslator } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n-provider";
import { StorefrontHeader, StorefrontFooter } from "@/components/storefront-chrome";

// The storefront chrome (header + footer + I18nProvider + the queries they
// need), factored out of (storefront)/layout.tsx so a route that lives
// OUTSIDE that route group can still render the identical shell. Right now
// that's /blog: its path is shared with the platform marketing blog, so it
// sits at src/app/blog/ and branches on getCurrentStore() — the same
// reason src/app/page.tsx can't use the storefront layout. The caller
// handles the no-store and maintenance-mode cases.
export async function StorefrontShell({
  store,
  children,
}: {
  store: Store;
  children: React.ReactNode;
}) {
  const { locale, messages } = await getTranslator(store.locale);
  const categoryRows = await withStoreContext(store.id, (tx) =>
    tx.select().from(categories).where(eq(categories.storeId, store.id))
  );
  const cartItemCount = await getCartItemCount(store.id);
  const { hasPosts, footerPages } = await getStorefrontChrome(store.id);
  const menuLinks = await getActiveMenuLinks(store.id);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <StorefrontHeader
        store={store}
        categories={categoryRows}
        cartItemCount={cartItemCount}
        hasBlog={hasPosts}
        menuLinks={menuLinks}
      />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
      <StorefrontFooter store={store} footerPages={footerPages} />
    </I18nProvider>
  );
}
