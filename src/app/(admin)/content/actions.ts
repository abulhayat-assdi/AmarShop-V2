"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { contentEntries, type ContentEntry } from "@/db/schema";
import { slugify, uniqueSlug } from "@/lib/slugify";

export type ContentState = { error?: string };

type Kind = ContentEntry["kind"];

type ParsedContent = {
  title: string;
  slugInput: string;
  excerpt: string | null;
  bodyMarkdown: string;
  status: ContentEntry["status"];
  showInFooter: boolean;
  footerOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

function parseForm(formData: FormData): { error: string } | ParsedContent {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "admin.content.errTitle" };

  const rawOrder = String(formData.get("footerOrder") ?? "").trim();
  const footerOrder = rawOrder ? Number(rawOrder) : 0;
  if (!Number.isInteger(footerOrder) || footerOrder < 0) {
    return { error: "admin.content.errNumber" };
  }

  return {
    title,
    slugInput: String(formData.get("slug") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    bodyMarkdown: String(formData.get("bodyMarkdown") ?? ""),
    status: String(formData.get("status") ?? "draft") === "published" ? "published" : "draft",
    showInFooter: formData.get("showInFooter") === "on",
    footerOrder,
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
  };
}

// Postgres unique_violation on (store_id, kind, slug).
function isSlugTaken(err: unknown): boolean {
  const cause = (err as { cause?: unknown } | null)?.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "23505" &&
    (cause as { constraint_name?: string }).constraint_name ===
      "content_entries_store_kind_slug_idx"
  );
}

function revalidateFor(kind: Kind, slug: string) {
  revalidatePath("/content");
  revalidatePath("/");
  if (kind === "post") {
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
  } else {
    revalidatePath(`/pages/${slug}`);
  }
}

export async function createContent(
  kind: Kind,
  _prev: ContentState,
  formData: FormData
): Promise<ContentState> {
  const session = await requirePermission("content:manage");
  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  let id: string;
  try {
    id = await withStoreContext(session.user.storeId, async (tx) => {
      const slug = await uniqueSlug(parsed.slugInput || parsed.title, async (candidate) => {
        const [row] = await tx
          .select({ id: contentEntries.id })
          .from(contentEntries)
          .where(
            and(
              eq(contentEntries.storeId, session.user.storeId),
              eq(contentEntries.kind, kind),
              eq(contentEntries.slug, candidate)
            )
          )
          .limit(1);
        return Boolean(row);
      });

      const [inserted] = await tx
        .insert(contentEntries)
        .values({
          storeId: session.user.storeId,
          kind,
          title: parsed.title,
          slug,
          excerpt: parsed.excerpt,
          bodyMarkdown: parsed.bodyMarkdown,
          status: parsed.status,
          publishedAt: parsed.status === "published" ? new Date() : null,
          showInFooter: parsed.showInFooter,
          footerOrder: parsed.footerOrder,
          seoTitle: parsed.seoTitle,
          seoDescription: parsed.seoDescription,
        })
        .returning({ id: contentEntries.id });
      return inserted.id;
    });
  } catch (err) {
    if (isSlugTaken(err)) return { error: "admin.content.errSlugTaken" };
    throw err;
  }

  revalidatePath("/content");
  redirect(`/content/${id}/edit`);
}

export async function updateContent(
  id: string,
  _prev: ContentState,
  formData: FormData
): Promise<ContentState> {
  const session = await requirePermission("content:manage");
  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  let result: { kind: Kind; slug: string; oldSlug: string } | null;
  try {
    result = await withStoreContext(session.user.storeId, async (tx) => {
      const [current] = await tx
        .select()
        .from(contentEntries)
        .where(and(eq(contentEntries.storeId, session.user.storeId), eq(contentEntries.id, id)))
        .limit(1);
      if (!current) return null;

      const desired = slugify(parsed.slugInput || parsed.title) || "item";
      let nextSlug = current.slug;
      if (desired !== current.slug) {
        nextSlug = await uniqueSlug(desired, async (candidate) => {
          const [row] = await tx
            .select({ id: contentEntries.id })
            .from(contentEntries)
            .where(
              and(
                eq(contentEntries.storeId, session.user.storeId),
                eq(contentEntries.kind, current.kind),
                eq(contentEntries.slug, candidate),
                ne(contentEntries.id, id)
              )
            )
            .limit(1);
          return Boolean(row);
        });
      }

      const startsPublished =
        parsed.status === "published" && !current.publishedAt;

      await tx
        .update(contentEntries)
        .set({
          title: parsed.title,
          slug: nextSlug,
          excerpt: parsed.excerpt,
          bodyMarkdown: parsed.bodyMarkdown,
          status: parsed.status,
          publishedAt: startsPublished ? new Date() : current.publishedAt,
          showInFooter: parsed.showInFooter,
          footerOrder: parsed.footerOrder,
          seoTitle: parsed.seoTitle,
          seoDescription: parsed.seoDescription,
          updatedAt: new Date(),
        })
        .where(and(eq(contentEntries.storeId, session.user.storeId), eq(contentEntries.id, id)));

      return { kind: current.kind, slug: nextSlug, oldSlug: current.slug };
    });
  } catch (err) {
    if (isSlugTaken(err)) return { error: "admin.content.errSlugTaken" };
    throw err;
  }

  if (!result) return { error: "admin.content.errNotFound" };
  revalidateFor(result.kind, result.oldSlug);
  revalidateFor(result.kind, result.slug);
  redirect("/content");
}

export async function deleteContent(id: string) {
  const session = await requirePermission("content:manage");

  const deleted = await withStoreContext(session.user.storeId, async (tx) => {
    const [row] = await tx
      .delete(contentEntries)
      .where(and(eq(contentEntries.storeId, session.user.storeId), eq(contentEntries.id, id)))
      .returning({ kind: contentEntries.kind, slug: contentEntries.slug });
    return row ?? null;
  });

  if (deleted) revalidateFor(deleted.kind, deleted.slug);
  revalidatePath("/content");
  redirect("/content");
}
