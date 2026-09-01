import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCartItemCount } from "@/lib/cart";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { StorefrontHeader, StorefrontFooter, ProductCard } from "@/components/storefront-chrome";
import { StorefrontMaintenance } from "@/components/storefront-maintenance";
import { getPrimaryImageUrls } from "@/lib/products/media";
import { getStorefrontChrome } from "@/lib/cms/queries";
import { getActiveMenuLinks } from "@/lib/menus/query";
import { I18nProvider } from "@/components/i18n-provider";
import { getTranslator } from "@/lib/i18n/server";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/chrome";
import {
  Hero,
  ProblemSolution,
  HowItWorks,
  DeveloperTeaser,
  Faq,
  ClosingCta,
} from "@/components/marketing/sections";
import { FeatureTabs } from "@/components/marketing/feature-tabs";
import { PricingSection } from "@/components/marketing/pricing-section";
import { TestimonialGrid } from "@/components/marketing/testimonials";
import { getPublishedTestimonials } from "@/lib/testimonials/query";
import { BRAND_NAME } from "@/lib/marketing/constants";

// The one URL shared between the storefront and the platform root (App
// Router route groups can't conditionally re-layout the same path based on
// runtime data) — see src/app/(storefront)/layout.tsx for everywhere else.

// On the platform host this is the marketing landing page, so give it real
// title/description (SITE_STRUCTURE.md Part A). On a storefront host, defer
// to the root layout's defaults exactly as before — return nothing.
export async function generateMetadata(): Promise<Metadata> {
  if (await getCurrentStore()) return {};
  const { t } = await getMarketingTranslator();
  return {
    title: `${t("marketing.home.hero.title")} — ${BRAND_NAME}`,
    description: t("marketing.home.hero.subtitle"),
  };
}

export default async function Home() {
  const store = await getCurrentStore();

  if (store) {
    // Merchant-toggled (Admin -> Account -> System). Checked before any of
    // this page's own queries — same gate as every other storefront route
    // (see (storefront)/layout.tsx), duplicated here because this is the
    // one URL Next's route groups can't share a layout with (see the
    // comment on the function below).
    if (store.maintenanceMode) {
      const { locale, messages, t } = await getTranslator(store.locale);
      return <StorefrontMaintenance storeName={store.name} locale={locale} messages={messages} t={t} />;
    }

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
    const menuLinks = await getActiveMenuLinks(store.id);
    const { locale, messages, t } = await getTranslator(store.locale);

    return (
      <I18nProvider locale={locale} messages={messages}>
        <StorefrontHeader
          store={store}
          menuLinks={menuLinks}
          categories={categoryRows}
          cartItemCount={cartItemCount}
          hasBlog={hasPosts}
        />
        <main className="mx-auto flex max-w-5xl flex-col gap-8 p-4">
          {/* Admin -> Default Pages: show/hide + reorder these two
              sections. Not a block editor — just the two sections this
              page has always had. */}
          {[
            {
              key: "categories",
              order: store.homeCategoriesOrder,
              show: store.homeShowCategories && categoryRows.length > 0,
              node: (
                <section key="categories" className="flex flex-col gap-4">
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
              ),
            },
            {
              key: "newArrivals",
              order: store.homeNewArrivalsOrder,
              show: store.homeShowNewArrivals,
              node: (
                <section key="newArrivals" className="flex flex-col gap-4">
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
              ),
            },
          ]
            .filter((s) => s.show)
            .sort((a, b) => a.order - b.order)
            .map((s) => s.node)}
        </main>
        <StorefrontFooter store={store} footerPages={footerPages} />
      </I18nProvider>
    );
  }

  // No store resolved → the platform's own host: render the public
  // marketing site (SITE_STRUCTURE.md Part A). The homepage is the one
  // marketing path that can't live inside the (marketing) route group — it
  // shares "/" with the storefront branch above — so it renders the same
  // marketing chrome components directly, mirroring the storefront chrome
  // split (see src/components/storefront-chrome.tsx).
  const { locale, messages, t } = await getMarketingTranslator();
  // One query drives both the nav/footer link and the preview section — a
  // testimonials block only exists when a platform admin has published one
  // (CLAUDE.md rule #8), never an empty placeholder.
  const testimonialPreview = await getPublishedTestimonials(3);
  const hasTestimonials = testimonialPreview.length > 0;

  return (
    <I18nProvider locale={locale} messages={messages}>
      <MarketingHeader t={t} locale={locale} hasTestimonials={hasTestimonials} />
      <main className="flex-1">
        <Hero t={t} />
        <ProblemSolution t={t} />

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            {t("marketing.home.showcase.title")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            {t("marketing.home.showcase.subtitle")}
          </p>
          <div className="mt-10">
            <FeatureTabs />
          </div>
        </section>

        <HowItWorks t={t} />

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            {t("marketing.pricing.hero.title")}
          </h2>
          <div className="mt-10">
            <PricingSection />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/pricing" className="underline">
              {t("marketing.common.viewPricing")}
            </Link>
          </p>
        </section>

        {hasTestimonials && (
          <section className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              {t("marketing.testimonials.homeTitle")}
            </h2>
            <div className="mt-10">
              <TestimonialGrid items={testimonialPreview} />
            </div>
            <p className="mt-6 text-center text-sm">
              <Link href="/testimonials" className="underline">
                {t("marketing.testimonials.seeAll")}
              </Link>
            </p>
          </section>
        )}

        <DeveloperTeaser t={t} />
        <Faq t={t} limit={8} />
        <ClosingCta t={t} />
      </main>
      <MarketingFooter t={t} hasTestimonials={hasTestimonials} />
    </I18nProvider>
  );
}
