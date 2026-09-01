"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/roles";
import { createPost, updatePost, setPostPublished, deletePost } from "@/lib/blog/mutate";

// Platform-operator only. `blog_posts` has no RLS (platform-owned
// marketing content), so requirePlatformAdmin() here is the guard.
// English only — an operator surface, like /stores/create.

export type BlogManagerState = { error?: string; ok?: boolean };

function parse(fd: FormData) {
  return {
    title: String(fd.get("title") ?? ""),
    slug: String(fd.get("slug") ?? ""),
    excerpt: String(fd.get("excerpt") ?? "") || null,
    bodyMarkdown: String(fd.get("bodyMarkdown") ?? ""),
    category: String(fd.get("category") ?? "") || null,
    authorName: String(fd.get("authorName") ?? "") || null,
    coverImageUrl: String(fd.get("coverImageUrl") ?? "") || null,
    published: fd.get("published") === "on",
  };
}

const ERR: Record<string, string> = {
  title_required: "Title is required.",
  body_required: "Body is required.",
};

function revalidateMarketing() {
  revalidatePath("/platform/blog");
  revalidatePath("/", "layout");
}

export async function createPostAction(
  _prev: BlogManagerState,
  fd: FormData
): Promise<BlogManagerState> {
  await requirePlatformAdmin();
  const res = await createPost(parse(fd));
  if (!res.ok) return { error: ERR[res.error] ?? "Could not save." };
  revalidateMarketing();
  return { ok: true };
}

export async function updatePostAction(
  _prev: BlogManagerState,
  fd: FormData
): Promise<BlogManagerState> {
  await requirePlatformAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const res = await updatePost(id, parse(fd));
  if (!res.ok) return { error: ERR[res.error] ?? "Could not save." };
  revalidateMarketing();
  return { ok: true };
}

export async function togglePostPublishedAction(fd: FormData) {
  await requirePlatformAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  await setPostPublished(id, fd.get("published") === "true");
  revalidateMarketing();
}

export async function deletePostAction(fd: FormData) {
  await requirePlatformAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  await deletePost(id);
  revalidateMarketing();
}
