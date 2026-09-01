import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { stores, staffMembers } from "@/db/schema";
import { isReservedSubdomain } from "@/lib/tenant/constants";
import { BD_PHONE_PATTERN } from "@/lib/phone";
import { TRIAL_DAYS, isValidPlanId } from "@/lib/billing/plans";

// The one place a store + its owner staff row are created. Shared by the
// platform-admin form (src/app/(platform)/stores/create) and the public
// self-serve signup (src/app/(marketing)/signup). Callers map `code` to
// their own (localised or not) copy — the helper stays i18n-free.

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type CreateStoreField =
  | "name"
  | "slug"
  | "ownerName"
  | "ownerPhone"
  | "ownerEmail"
  | "ownerPassword";

export type CreateStoreError =
  | "name_required"
  | "owner_name_required"
  | "invalid_phone"
  | "email_required"
  | "weak_password"
  | "invalid_slug"
  | "slug_taken"
  | "email_taken"
  | "invalid_locale";

export type CreateStoreInput = {
  name: string;
  slug: string;
  locale: string;
  digitalEnabled: boolean;
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string;
  ownerPassword: string;
  // The plan the merchant commits to. Only meaningful once they actually
  // pay (effectivePlanId() ignores it while `trialing`); stored so /billing
  // can pre-highlight their choice. Anything invalid falls back to "free".
  plan?: string;
};

export type CreateStoreResult =
  | { ok: true; storeId: string }
  | { ok: false; code: CreateStoreError; field?: CreateStoreField };

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

export async function createStoreWithOwner(input: CreateStoreInput): Promise<CreateStoreResult> {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const ownerName = input.ownerName.trim();
  const ownerPhone = input.ownerPhone?.trim() || null;
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const locale = input.locale;
  const plan = input.plan && isValidPlanId(input.plan) ? input.plan : "free";

  if (!name) return { ok: false, code: "name_required", field: "name" };
  if (!ownerName) return { ok: false, code: "owner_name_required", field: "ownerName" };
  if (ownerPhone && !BD_PHONE_PATTERN.test(ownerPhone)) {
    return { ok: false, code: "invalid_phone", field: "ownerPhone" };
  }
  if (!ownerEmail) return { ok: false, code: "email_required", field: "ownerEmail" };
  if (input.ownerPassword.length < 8) {
    return { ok: false, code: "weak_password", field: "ownerPassword" };
  }
  if (!SLUG_PATTERN.test(slug) || isReservedSubdomain(slug)) {
    return { ok: false, code: "invalid_slug", field: "slug" };
  }
  if (locale !== "bn" && locale !== "en") {
    return { ok: false, code: "invalid_locale" };
  }

  const passwordHash = await bcrypt.hash(input.ownerPassword, 10);
  // Every new store starts a TRIAL_DAYS trial (PROJECT_PLAN.md §8): status
  // `trialing` + a real trial_ends_at, so effectivePlanId() grants the
  // courtesy TRIAL_PLAN limits until it lapses (then the lifecycle cron /
  // getSubscription's self-heal drops it to `free`).
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000);

  try {
    // Store + owner staff row in ONE transaction: a duplicate owner email
    // used to leave an orphaned, ownerless store holding its slug forever
    // (the store insert had already committed when the staff insert
    // failed) — a real bug hit during local testing, not a hypothetical.
    const storeId = await db.transaction(async (tx) => {
      const [store] = await tx
        .insert(stores)
        .values({
          name,
          slug,
          locale,
          status: "active",
          digitalEnabled: input.digitalEnabled,
          subscriptionPlan: plan,
          subscriptionStatus: "trialing",
          trialEndsAt,
        })
        .returning();

      await tx.execute(sql`select set_config('app.current_store_id', ${store.id}, true)`);

      await tx.insert(staffMembers).values({
        storeId: store.id,
        name: ownerName,
        phone: ownerPhone,
        email: ownerEmail,
        passwordHash,
        role: "owner",
      });

      return store.id;
    });
    return { ok: true, storeId };
  } catch (err) {
    if (isUniqueViolation(err, "stores_slug_idx")) {
      return { ok: false, code: "slug_taken", field: "slug" };
    }
    if (isUniqueViolation(err, "staff_members_email_idx")) {
      return { ok: false, code: "email_taken", field: "ownerEmail" };
    }
    throw err;
  }
}
