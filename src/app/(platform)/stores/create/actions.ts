"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { stores, staffMembers } from "@/db/schema";
import { isReservedSubdomain } from "@/lib/tenant/constants";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type CreateStoreField = "name" | "slug" | "ownerName" | "ownerEmail" | "ownerPassword";
export type CreateStoreState = { error?: string; field?: CreateStoreField };

// drizzle-orm's postgres-js driver wraps the raw driver error in `.cause`
// (a DrizzleQueryError with { query, params, cause }) rather than exposing
// `code`/`constraint_name` directly on the thrown error — verified against
// a real duplicate-key failure, not assumed.
function isUniqueViolation(err: unknown, constraint: string): boolean {
  const cause = (err as { cause?: unknown } | null)?.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "23505" &&
    (cause as { constraint_name?: string }).constraint_name === constraint
  );
}

// Minimal Phase-0 store creation: enough to exercise proxy.ts tenant
// resolution end to end (create a store, then hit {slug}.<platform host>).
// Full onboarding UX (plan selection, ToS, etc.) is Phase 1 (SITE_STRUCTURE.md).
//
// Store + owner staff row are created in ONE transaction on purpose: a
// duplicate owner email used to leave behind an orphaned, ownerless store
// still holding its slug forever (the store insert had already committed
// by the time the staff insert failed) — a real bug hit during local
// testing, not a hypothetical.
export async function createStore(
  _prevState: CreateStoreState,
  formData: FormData
): Promise<CreateStoreState> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const locale = String(formData.get("locale") ?? "bn");
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "")
    .trim()
    .toLowerCase();
  const ownerPassword = String(formData.get("ownerPassword") ?? "");

  if (!name) {
    return { error: "Store name is required.", field: "name" };
  }
  if (!ownerName) {
    return { error: "Your name is required.", field: "ownerName" };
  }
  if (!ownerEmail) {
    return { error: "Email is required.", field: "ownerEmail" };
  }
  if (ownerPassword.length < 8) {
    return { error: "Password must be at least 8 characters.", field: "ownerPassword" };
  }
  if (!SLUG_PATTERN.test(slug) || isReservedSubdomain(slug)) {
    return {
      error: "Subdomain must be lowercase letters, numbers, and hyphens only.",
      field: "slug",
    };
  }
  if (locale !== "bn" && locale !== "en") {
    return { error: "Invalid locale." };
  }

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  try {
    await db.transaction(async (tx) => {
      const [store] = await tx
        .insert(stores)
        .values({ name, slug, locale, status: "active" })
        .returning();

      await tx.execute(sql`select set_config('app.current_store_id', ${store.id}, true)`);

      await tx.insert(staffMembers).values({
        storeId: store.id,
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: "owner",
      });
    });
  } catch (err) {
    if (isUniqueViolation(err, "stores_slug_idx")) {
      return { error: "That subdomain is already taken — try another one.", field: "slug" };
    }
    if (isUniqueViolation(err, "staff_members_email_idx")) {
      return {
        error: "That email is already registered — use a different email, or sign in instead.",
        field: "ownerEmail",
      };
    }
    throw err;
  }

  redirect("/login");
}
