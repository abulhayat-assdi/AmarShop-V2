import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import type { BlogPost } from "@/db/schema";

// Marketing blog UI (SITE_STRUCTURE.md Part A "Blog"). `category` is
// always a clean operator-typed label — never a raw path (the audit's
// "Marketing>Ecommerce|Uncategorized" bug). Callers pass pre-formatted
// dates so this stays locale-agnostic.

function BlogCard({ post, dateLabel }: { post: BlogPost; dateLabel: string | null }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-5 hover:border-gray-400"
    >
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- operator-provided remote URL, not a Next-optimizable static asset
        <img src={post.coverImageUrl} alt="" className="aspect-video w-full rounded-lg object-cover" />
      )}
      <div className="flex items-center gap-2 text-xs">
        {post.category && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
            {post.category}
          </span>
        )}
        {dateLabel && <span className="text-gray-400">{dateLabel}</span>}
      </div>
      <span className="font-semibold">{post.title}</span>
      {post.excerpt && <span className="text-sm text-gray-600">{post.excerpt}</span>}
    </Link>
  );
}

export function MarketingBlogIndex({
  t,
  posts,
  categories,
  activeCategory,
  dateLabels,
}: {
  t: Translator;
  posts: BlogPost[];
  categories: string[];
  activeCategory?: string;
  dateLabels: Record<string, string | null>;
}) {
  const pill = "rounded-full border px-3 py-1 text-sm";
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("marketing.blog.title")}</h1>
      <p className="mt-2 text-gray-600">{t("marketing.blog.subtitle")}</p>

      {categories.length > 0 && (
        <nav className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/blog"
            className={`${pill} ${!activeCategory ? "border-black bg-black text-white" : "border-gray-300 text-gray-600 hover:border-gray-400"}`}
          >
            {t("marketing.blog.all")}
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/blog?category=${encodeURIComponent(c)}`}
              className={`${pill} ${activeCategory === c ? "border-black bg-black text-white" : "border-gray-300 text-gray-600 hover:border-gray-400"}`}
            >
              {c}
            </Link>
          ))}
        </nav>
      )}

      {posts.length === 0 ? (
        <p className="mt-10 text-gray-500">{t("marketing.blog.empty")}</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <BlogCard key={p.id} post={p} dateLabel={dateLabels[p.id] ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketingBlogArticle({
  t,
  post,
  html,
  dateLabel,
}: {
  t: Translator;
  post: BlogPost;
  html: string;
  dateLabel: string | null;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/blog" className="text-sm text-gray-500 hover:text-black">
        ← {t("marketing.blog.back")}
      </Link>

      <div className="mt-6 flex items-center gap-2 text-xs">
        {post.category && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
            {post.category}
          </span>
        )}
        {dateLabel && <span className="text-gray-400">{dateLabel}</span>}
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">{post.title}</h1>
      {post.authorName && (
        <p className="mt-2 text-sm text-gray-500">{t("marketing.blog.by", { name: post.authorName })}</p>
      )}

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- operator-provided remote URL
        <img src={post.coverImageUrl} alt="" className="mt-6 w-full rounded-xl object-cover" />
      )}

      <div className="cms-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="mt-12 flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <p className="text-sm font-medium">{t("marketing.blog.ctaText")}</p>
        <Link
          href="/signup"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t("marketing.blog.ctaButton")}
        </Link>
      </div>
    </article>
  );
}
