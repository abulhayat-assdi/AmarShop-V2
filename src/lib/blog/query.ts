import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { blogPosts, type BlogPost } from "@/db/schema";

// Reads for the public marketing blog (/blog, /blog/[slug]) and the
// /platform/blog admin. `blog_posts` sits outside the RLS boundary
// (platform-owned marketing content — see the schema file), so these use
// the plain `db` handle with explicit filters. Only `published = true`
// rows are ever returned to the marketing site.

export function getPublishedPosts(category?: string): Promise<BlogPost[]> {
  const filters = [eq(blogPosts.published, true)];
  if (category) filters.push(eq(blogPosts.category, category));
  return db
    .select()
    .from(blogPosts)
    .where(and(...filters))
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true)))
    .limit(1);
  return row ?? null;
}

// Distinct category labels across published posts, for the filter pills.
export async function listPublishedCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: blogPosts.category })
    .from(blogPosts)
    .where(and(eq(blogPosts.published, true), isNotNull(blogPosts.category)))
    .orderBy(blogPosts.category);
  return rows.map((r) => r.category).filter((c): c is string => !!c);
}

export async function hasPublishedPosts(): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`1` })
    .from(blogPosts)
    .where(eq(blogPosts.published, true))
    .limit(1);
  return !!row;
}

export function listPostsForAdmin(): Promise<BlogPost[]> {
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return row ?? null;
}

export async function slugExists(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  return !!row;
}
