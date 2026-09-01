"use server";

import { headers } from "next/headers";
import { signIn } from "@/lib/auth/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { createStoreWithOwner, type CreateStoreField } from "@/lib/stores/create";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

export type SignupField = CreateStoreField | "plan" | "terms";
export type SignupState = { error?: MessageRef; field?: SignupField };

// Public self-serve merchant signup (SITE_STRUCTURE.md Part A). Creates the
// owner account + store + a TRIAL_DAYS trial via createStoreWithOwner()
// (shared with the platform-admin path), then signs the new owner in and
// drops them on the admin dashboard. No email verification yet — there is
// no transactional email in the app (Email Gateways is settings-only).
export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const rl = await checkRateLimit(`signup:${ip}`, { limit: 5, windowSeconds: 600 });
  if (!rl.ok) return { error: msg("marketing.signup.err.rateLimited") };

  if (formData.get("terms") !== "on") {
    return { error: msg("marketing.signup.err.terms"), field: "terms" };
  }

  const email = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const password = String(formData.get("ownerPassword") ?? "");

  const result = await createStoreWithOwner({
    name: String(formData.get("storeName") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    locale: String(formData.get("locale") ?? "bn"),
    digitalEnabled: String(formData.get("storeType") ?? "ecommerce") === "digital",
    ownerName: String(formData.get("ownerName") ?? ""),
    ownerPhone: String(formData.get("ownerPhone") ?? "") || null,
    ownerEmail: email,
    ownerPassword: password,
    plan: String(formData.get("plan") ?? "free"),
  });

  if (!result.ok) {
    return { error: msg(`marketing.signup.err.${result.code}`), field: result.field };
  }

  // Credentials are the ones just created — signIn throws the redirect to
  // /dashboard (the admin lives on the platform host, like /login does).
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}
