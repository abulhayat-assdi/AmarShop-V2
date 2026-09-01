import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { getTranslator } from "@/lib/i18n/server";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { getPublishedEntry } from "@/lib/cms/queries";
import { getPublishedPostBySlug } from "@/lib/blog/query";
import { renderMarkdown } from "@/lib/cms/render";
import { StorefrontShell } from "@/components/storefront-shell";
import { StorefrontMaintenance } from "@/components/storefront-maintenance";
import { MarketingShell } from "@/components/marketing/shell";
import { MarketingBlogArticle } from "@/components/marketing/blog";
import { BRAND_NAME } from "@/lib/marketing/constants";

// See src/app/blog/page.tsx — /blog is shared between the merchant
// storefront blog and the platform marketing blog; branch on the store.

function dateLabel(d: Date | null, locale: string): string | null {
  return d ? new Date(d).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB") : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (store) {
    const entry = await getPublishedEntry(store.id, "post", slug);
    if (!entry) return {};
    return {
      title: `${entry.seoTitle ?? entry.title} — ${store.name}`,
      description: entry.seoDescription ?? entry.excerpt ?? undefined,
    };
  }
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — ${BRAND_NAME}`,
    description: post.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getCurrentStore();

  // ── Merchant storefront blog post (unchanged behaviour) ────────────────
  if (store) {
    if (store.maintenanceMode) {
      const { locale, messages, t } = await getTranslator(store.locale);
      return <StorefrontMaintenance storeName={store.name} locale={locale} messages={messages} t={t} />;
    }
    const entry = await getPublishedEntry(store.id, "post", slug);
    if (!entry) notFound();
    const { t, locale } = await getTranslator(store.locale);
    const html = renderMarkdown(entry.bodyMarkdown);
    return (
      <StorefrontShell store={store}>
        <article className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{entry.title}</h1>
            {entry.publishedAt && (
              <span className="text-xs text-gray-500">
                {t("blog.publishedOn", { date: dateLabel(entry.publishedAt, locale)! })}
              </span>
            )}
          </header>
          <div className="cms-content" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </StorefrontShell>
    );
  }

  // ── Platform marketing blog post ──────────────────────────────────────
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();
  const { t, locale } = await getMarketingTranslator();
  const html = renderMarkdown(post.bodyMarkdown);

  return (
    <MarketingShell>
      <MarketingBlogArticle t={t} post={post} html={html} dateLabel={dateLabel(post.publishedAt, locale)} />
    </MarketingShell>
  );
}
