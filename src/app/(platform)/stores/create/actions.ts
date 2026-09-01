"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/roles";
import {
  createStoreWithOwner,
  type CreateStoreError,
  type CreateStoreField,
} from "@/lib/stores/create";

export type { CreateStoreField };
export type CreateStoreState = { error?: string; field?: CreateStoreField };

// Platform-admin store creation. The public self-serve path is
// src/app/(marketing)/signup — both call createStoreWithOwner(); this one
// keeps its English-only copy and lands on /login (no auto sign-in).
const MESSAGES: Record<CreateStoreError, string> = {
  name_required: "Store name is required.",
  owner_name_required: "Your name is required.",
  invalid_phone: "Enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX).",
  email_required: "Email is required.",
  weak_password: "Password must be at least 8 characters.",
  invalid_slug: "Subdomain must be lowercase letters, numbers, and hyphens only.",
  slug_taken: "That subdomain is already taken — try another one.",
  email_taken: "That email is already registered — use a different email, or sign in instead.",
  invalid_locale: "Invalid locale.",
};

export async function createStore(
  _prevState: CreateStoreState,
  formData: FormData
): Promise<CreateStoreState> {
  // Guard the action itself, not just the page — a Server Action is a POST
  // endpoint callable independent of its form.
  await requirePlatformAdmin();

  const result = await createStoreWithOwner({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    locale: String(formData.get("locale") ?? "bn"),
    digitalEnabled: String(formData.get("storeType") ?? "ecommerce") === "digital",
    ownerName: String(formData.get("ownerName") ?? ""),
    ownerPhone: String(formData.get("ownerPhone") ?? "") || null,
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
    ownerPassword: String(formData.get("ownerPassword") ?? ""),
  });

  if (!result.ok) {
    return { error: MESSAGES[result.code], field: result.field };
  }

  redirect("/login");
}
