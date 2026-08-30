import { and, asc, desc, eq, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { contentEntries, type ContentEntry } from "@/db/schema";

export type PostListItem = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | null;
};

export async function listPublishedPosts(storeId: string): Promise<PostListItem[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select({
        slug: contentEntries.slug,
        title: contentEntries.title,
        excerpt: contentEntries.excerpt,
        publishedAt: contentEntries.publishedAt,
      })
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.storeId, storeId),
          eq(contentEntries.kind, "post"),
          eq(contentEntries.status, "published")
        )
      )
      .orderBy(sql`${contentEntries.publishedAt} desc nulls last`)
  );
}

export async function getPublishedEntry(
  storeId: string,
  kind: ContentEntry["kind"],
  slug: string
): Promise<ContentEntry | null> {
  return withStoreContext(storeId, async (tx) => {
    const [entry] = await tx
      .select()
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.storeId, storeId),
          eq(contentEntries.kind, kind),
          eq(contentEntries.slug, slug),
          eq(contentEntries.status, "published")
        )
      )
      .limit(1);
    return entry ?? null;
  });
}

export type StorefrontChrome = {
  hasPosts: boolean;
  footerPages: { slug: string; title: string }[];
};

// One call, used by both storefront chrome call sites
// (src/app/(storefront)/layout.tsx and src/app/page.tsx).
export async function getStorefrontChrome(storeId: string): Promise<StorefrontChrome> {
  return withStoreContext(storeId, async (tx) => {
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.storeId, storeId),
          eq(contentEntries.kind, "post"),
          eq(contentEntries.status, "published")
        )
      );

    const footerPages = await tx
      .select({ slug: contentEntries.slug, title: contentEntries.title })
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.storeId, storeId),
          eq(contentEntries.kind, "page"),
          eq(contentEntries.status, "published"),
          eq(contentEntries.showInFooter, true)
        )
      )
      .orderBy(asc(contentEntries.footerOrder), asc(contentEntries.title));

    return { hasPosts: count > 0, footerPages };
  });
}

export async function listEntriesForAdmin(storeId: string): Promise<ContentEntry[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(contentEntries)
      .where(eq(contentEntries.storeId, storeId))
      .orderBy(desc(contentEntries.updatedAt))
  );
}
