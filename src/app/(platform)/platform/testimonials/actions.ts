"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/roles";
import {
  createTestimonial,
  updateTestimonial,
  setTestimonialPublished,
  deleteTestimonial,
} from "@/lib/testimonials/mutate";

// Platform-operator only. `testimonials` has no RLS (platform-owned
// marketing content), so requirePlatformAdmin() here is the guard. English
// only — an operator-facing surface, like /stores/create.

export type ManagerState = { error?: string; ok?: boolean };

function parse(formData: FormData) {
  return {
    authorName: String(formData.get("authorName") ?? ""),
    authorRole: String(formData.get("authorRole") ?? "") || null,
    quote: String(formData.get("quote") ?? ""),
    outcome: String(formData.get("outcome") ?? "") || null,
    displayOrder: Number(formData.get("displayOrder") ?? 0),
    published: formData.get("published") === "on",
  };
}

const ERR: Record<string, string> = {
  author_required: "Author name is required.",
  quote_required: "Quote is required.",
};

// Both the marketing homepage (/) and /testimonials read this table, and
// the nav link appears site-wide — revalidate the whole marketing tree.
function revalidateMarketing() {
  revalidatePath("/platform/testimonials");
  revalidatePath("/", "layout");
}

export async function createTestimonialAction(
  _prev: ManagerState,
  formData: FormData
): Promise<ManagerState> {
  await requirePlatformAdmin();
  const res = await createTestimonial(parse(formData));
  if (!res.ok) return { error: ERR[res.error] ?? "Could not save." };
  revalidateMarketing();
  return { ok: true };
}

export async function updateTestimonialAction(
  _prev: ManagerState,
  formData: FormData
): Promise<ManagerState> {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing id." };
  const res = await updateTestimonial(id, parse(formData));
  if (!res.ok) return { error: ERR[res.error] ?? "Could not save." };
  revalidateMarketing();
  return { ok: true };
}

export async function togglePublishedAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setTestimonialPublished(id, formData.get("published") === "true");
  revalidateMarketing();
}

export async function deleteTestimonialAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteTestimonial(id);
  revalidateMarketing();
}
