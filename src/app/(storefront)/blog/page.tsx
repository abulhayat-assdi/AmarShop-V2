import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { getTranslator } from "@/lib/i18n/server";
import { listPublishedPosts } from "@/lib/cms/queries";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getCurrentStore();
  if (!store) return {};
  const { t } = await getTranslator(store.locale);
  return { title: `${t("blog.title")} — ${store.name}` };
}

export default async function BlogIndexPage() {
  const store = await getCurrentStore();
  if (!store) notFound();

  const [posts, { t, locale }] = await Promise.all([
    listPublishedPosts(store.id),
    getTranslator(store.locale),
  ]);
  const dateLocale = locale === "bn" ? "bn-BD" : "en-GB";

  return (
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
                  {t("blog.publishedOn", {
                    date: new Date(post.publishedAt).toLocaleDateString(dateLocale),
                  })}
                </span>
              )}
              {post.excerpt && <p className="text-sm text-gray-700">{post.excerpt}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
