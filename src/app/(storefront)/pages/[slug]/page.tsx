import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
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
  const entry = await getPublishedEntry(store.id, "page", slug);
  if (!entry) return {};
  return {
    title: `${entry.seoTitle ?? entry.title} — ${store.name}`,
    description: entry.seoDescription ?? undefined,
  };
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (!store) notFound();

  const entry = await getPublishedEntry(store.id, "page", slug);
  if (!entry) notFound();

  const html = renderMarkdown(entry.bodyMarkdown);

  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{entry.title}</h1>
      <div className="cms-content" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
