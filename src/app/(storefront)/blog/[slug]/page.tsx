import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { getTranslator } from "@/lib/i18n/server";
import { getPublishedEntry } from "@/lib/cms/queries";
import { renderMarkdown } from "@/lib/cms/render";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (!store) return {};
  const entry = await getPublishedEntry(store.id, "post", slug);
  if (!entry) return {};
  return {
    title: `${entry.seoTitle ?? entry.title} — ${store.name}`,
    description: entry.seoDescription ?? entry.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (!store) notFound();

  const entry = await getPublishedEntry(store.id, "post", slug);
  if (!entry) notFound();

  const { t, locale } = await getTranslator(store.locale);
  const dateLocale = locale === "bn" ? "bn-BD" : "en-GB";
  const html = renderMarkdown(entry.bodyMarkdown);

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{entry.title}</h1>
        {entry.publishedAt && (
          <span className="text-xs text-gray-500">
            {t("blog.publishedOn", {
              date: new Date(entry.publishedAt).toLocaleDateString(dateLocale),
            })}
          </span>
        )}
      </header>
      <div className="cms-content" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
