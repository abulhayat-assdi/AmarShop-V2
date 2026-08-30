import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { auth } from "@/lib/auth/config";
import { getCartItemCount } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { StorefrontHeader, StorefrontFooter, ProductCard } from "@/components/storefront-chrome";
import { getPrimaryImageUrls } from "@/lib/products/media";
import { getStorefrontChrome } from "@/lib/cms/queries";
import { I18nProvider } from "@/components/i18n-provider";
import { getTranslator } from "@/lib/i18n/server";
import { signOutAction } from "./actions";

// The one URL shared between the storefront and the platform root (App
// Router route groups can't conditionally re-layout the same path based on
// runtime data) — see src/app/(storefront)/layout.tsx for everywhere else.
export default async function Home() {
  const store = await getCurrentStore();

  if (store) {
    const { categoryRows, productRows } = await withStoreContext(store.id, async (tx) => {
      const categoryRows = await tx.select().from(categories).where(eq(categories.storeId, store.id));
      const productRows = await tx
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          price: productVariants.price,
          discountedPrice: productVariants.discountedPrice,
        })
        .from(products)
        .innerJoin(productVariants, eq(productVariants.productId, products.id))
        .where(and(eq(products.storeId, store.id), eq(products.status, "active")))
        .orderBy(desc(products.createdAt));
      return { categoryRows, productRows };
    });
    const imageUrls = await getPrimaryImageUrls(
      store.id,
      productRows.map((product) => product.id)
    );
    const cartItemCount = await getCartItemCount(store.id);
    const { hasPosts, footerPages } = await getStorefrontChrome(store.id);
    const { locale, messages, t } = await getTranslator(store.locale);

    return (
      <I18nProvider locale={locale} messages={messages}>
        <StorefrontHeader
          store={store}
          categories={categoryRows}
          cartItemCount={cartItemCount}
          hasBlog={hasPosts}
        />
        <main className="mx-auto flex max-w-5xl flex-col gap-8 p-4">
          {categoryRows.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{t("home.categories")}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {categoryRows.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="rounded border p-4 text-center hover:border-gray-400"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("home.newArrivals")}</h2>
            {productRows.length === 0 ? (
              <p className="text-gray-500">{t("home.noProducts")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {productRows.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{ ...product, imageUrl: imageUrls[product.id] ?? null }}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
        <StorefrontFooter store={store} footerPages={footerPages} />
      </I18nProvider>
    );
  }

  const session = await auth();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">AmarShop</h1>
      <p className="text-gray-600">Multi-tenant e-commerce platform — Phase 0 foundation.</p>

      {session?.user ? (
        <div className="flex flex-col gap-2 rounded border border-green-400 bg-green-50 p-4">
          <p className="text-green-800">
            Signed in as <strong>{session.user.email}</strong> — role{" "}
            <code className="rounded bg-white px-1">{session.user.role}</code>
            {session.user.isPlatformAdmin && (
              <>
                {" "}
                (<code className="rounded bg-white px-1">platform admin</code>)
              </>
            )}
          </p>
          <form action={signOutAction}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link href="/stores/create" className="underline">
            Create a store
          </Link>
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      )}
    </main>
  );
}
