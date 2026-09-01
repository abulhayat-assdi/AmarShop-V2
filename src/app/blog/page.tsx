import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentStore } from "@/lib/tenant/current";
import { getTranslator } from "@/lib/i18n/server";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { listPublishedPosts } from "@/lib/cms/queries";
import { getPublishedPosts, listPublishedCategories } from "@/lib/blog/query";
import { StorefrontShell } from "@/components/storefront-shell";
import { StorefrontMaintenance } from "@/components/storefront-maintenance";
import { MarketingShell } from "@/components/marketing/shell";
import { MarketingBlogIndex } from "@/components/marketing/blog";
import { BRAND_NAME } from "@/lib/marketing/constants";

// /blog is shared between a merchant's own storefront blog (a resolved
// store) and the platform's marketing blog (no store) — the same
// can't-use-a-route-group situation as src/app/page.tsx, so it lives here
// and branches on getCurrentStore().

function dateLabel(d: Date | null, locale: string): string | null {
  return d ? new Date(d).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB") : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await getCurrentStore();
  if (store) {
    const { t } = await getTranslator(store.locale);
    return { title: `${t("blog.title")} — ${store.name}` };
  }
  const { t } = await getMarketingTranslator();
  return {
    title: `${t("marketing.blog.title")} — ${BRAND_NAME}`,
    description: t("marketing.blog.subtitle"),
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const store = await getCurrentStore();

  // ── Merchant storefront blog (unchanged behaviour, now wrapped in the
  //    shell that (storefront)/layout.tsx used to provide) ──────────────
  if (store) {
    if (store.maintenanceMode) {
      const { locale, messages, t } = await getTranslator(store.locale);
      return <StorefrontMaintenance storeName={store.name} locale={locale} messages={messages} t={t} />;
    }
    const [posts, { t, locale }] = await Promise.all([
      listPublishedPosts(store.id),
      getTranslator(store.locale),
    ]);
    return (
      <StorefrontShell store={store}>
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-semibold">{t("blog.title")}</h1>
          {posts.length === 0 ? (
            <p className="text-gray-500">{t("blog.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-6">
              {posts.map((post) => (
                <li key={post.slug} className="flex flex-col gap-1">
                  <Link href={`/blog/${post.slug}`} className="text-lg font-medium hover:underline">
                    {post.title}
                  </Link>
                  {post.publishedAt && (
                    <span className="text-xs text-gray-500">
                      {t("blog.publishedOn", { date: dateLabel(post.publishedAt, locale)! })}
                    </span>
                  )}
                  {post.excerpt && <p className="text-sm text-gray-700">{post.excerpt}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </StorefrontShell>
    );
  }

  // ── Platform marketing blog ────────────────────────────────────────────
  const sp = await searchParams;
  const category = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const { t, locale } = await getMarketingTranslator();
  const [posts, categories] = await Promise.all([
    getPublishedPosts(category),
    listPublishedCategories(),
  ]);
  const dateLabels = Object.fromEntries(
    posts.map((p) => [p.id, dateLabel(p.publishedAt, locale)])
  );

  return (
    <MarketingShell>
      <MarketingBlogIndex
        t={t}
        posts={posts}
        categories={categories}
        activeCategory={category}
        dateLabels={dateLabels}
      />
    </MarketingShell>
  );
}
