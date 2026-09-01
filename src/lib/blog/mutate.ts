import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { blogPosts, type BlogPost } from "@/db/schema";
import { uniqueSlug } from "@/lib/slugify";
import { slugExists } from "./query";

// Writes for /platform/blog. Callers (the Server Actions) gate with
// requirePlatformAdmin() first — there is no RLS on this table.

export type BlogInput = {
  title: string;
  slug: string;
  excerpt: string | null;
  bodyMarkdown: string;
  category: string | null;
  authorName: string | null;
  coverImageUrl: string | null;
  published: boolean;
};

export type BlogError = "title_required" | "body_required";
export type BlogResult = { ok: true; id: string } | { ok: false; error: BlogError };

function normalise(input: BlogInput) {
  return {
    title: input.title.trim(),
    slug: input.slug.trim().toLowerCase(),
    excerpt: input.excerpt?.trim() || null,
    bodyMarkdown: input.bodyMarkdown,
    category: input.category?.trim() || null,
    authorName: input.authorName?.trim() || null,
    coverImageUrl: input.coverImageUrl?.trim() || null,
    published: input.published,
  };
}

export async function createPost(input: BlogInput): Promise<BlogResult> {
  const v = normalise(input);
  if (!v.title) return { ok: false, error: "title_required" };
  if (!v.bodyMarkdown.trim()) return { ok: false, error: "body_required" };

  const slug = await uniqueSlug(v.slug || v.title, slugExists);
  const [row] = await db
    .insert(blogPosts)
    .values({
      ...v,
      slug,
      publishedAt: v.published ? new Date() : null,
    })
    .returning({ id: blogPosts.id });
  return { ok: true, id: row.id };
}

export async function updatePost(id: string, input: BlogInput): Promise<BlogResult> {
  const v = normalise(input);
  if (!v.title) return { ok: false, error: "title_required" };
  if (!v.bodyMarkdown.trim()) return { ok: false, error: "body_required" };

  const [current] = await db
    .select({ published: blogPosts.published, publishedAt: blogPosts.publishedAt, slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);
  if (!current) return { ok: false, error: "title_required" };

  // Keep the existing slug unless the operator actually changed it; only
  // then re-run uniqueness (ignoring this row's own current slug).
  let slug = current.slug;
  if (v.slug && v.slug !== current.slug) {
    slug = await uniqueSlug(v.slug, async (c) => c !== current.slug && (await slugExists(c)));
  }

  await db
    .update(blogPosts)
    .set({
      ...v,
      slug,
      // Stamp published_at the first time it goes live; keep it thereafter.
      publishedAt: v.published ? current.publishedAt ?? new Date() : current.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));
  return { ok: true, id };
}

export async function setPostPublished(id: string, published: boolean): Promise<void> {
  const [current] = await db
    .select({ publishedAt: blogPosts.publishedAt })
    .from(blogPosts)
    .where(eq(blogPosts.id, id))
    .limit(1);
  await db
    .update(blogPosts)
    .set({
      published,
      publishedAt: published ? current?.publishedAt ?? new Date() : current?.publishedAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));
}

export async function deletePost(id: string): Promise<void> {
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

export type { BlogPost };
