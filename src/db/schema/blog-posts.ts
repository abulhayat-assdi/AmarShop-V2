import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

// The PLATFORM's own content-marketing blog, shown on the public marketing
// site at /blog (SITE_STRUCTURE.md Part A). Authored by a platform admin
// at /platform/blog. Platform-owned content, NOT tenant data — no
// `store_id`, and DELIBERATELY OUTSIDE the app.current_store_id RLS
// boundary, the same call `stores` / `platform_invoices` / `testimonials`
// make. Writes are gated by requirePlatformAdmin(); the marketing site
// reads only `published = true`. Not a rule #2 gap — no tenant dimension.
//
// This is separate from `content_entries` (kind = 'post'), which is a
// MERCHANT's own storefront blog — different owner, different table.
//
// `category` is a plain display label ("Guides", "Product news"), never an
// internal path/enum (SITE_STRUCTURE.md: don't render a raw category-path
// string as a badge). `body_markdown` is rendered + sanitised at read time
// via the shared src/lib/cms/render.ts. `published_at` is stamped once, on
// first publish, and drives ordering + the displayed date.
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyMarkdown: text("body_markdown").notNull().default(""),
    category: text("category"),
    authorName: text("author_name"),
    coverImageUrl: text("cover_image_url"),
    published: boolean("published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_idx").on(table.slug),
    index("blog_posts_published_published_at_idx").on(table.published, table.publishedAt),
  ]
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
