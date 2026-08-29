"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { slugHostFor } from "@/lib/tenant/resolve";
import {
  normalizeCustomDomain,
  platformIpsFromEnv,
  validateCustomDomain,
  verifyCustomDomainDns,
} from "@/lib/tenant/custom-domain";

export type DomainActionState = { error?: string; ok?: boolean };

// drizzle-orm wraps the driver error in `.cause` — same shape as
// stores/create/actions.ts's duplicate-key handling.
function isUniqueViolation(err: unknown, constraint: string): boolean {
  const cause = (err as { cause?: unknown } | null)?.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "23505" &&
    (cause as { constraint_name?: string }).constraint_name === constraint
  );
}

// stores is outside the RLS boundary (src/db/schema/stores.ts) — write via
// `db` directly, scoped by the session's own storeId, exactly like
// stores/create/actions.ts. withStoreContext would be wrong here.

export async function saveDomainAction(
  _prev: DomainActionState,
  formData: FormData
): Promise<DomainActionState> {
  const session = await requireRole("admin");
  const domain = normalizeCustomDomain(String(formData.get("domain") ?? ""));

  const valid = validateCustomDomain(domain, process.env.PLATFORM_ROOT_DOMAIN);
  if (!valid.ok) return { error: valid.reason };

  const [current] = await db
    .select({ customDomain: stores.customDomain })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  // Re-submitting the same domain shouldn't knock a live domain back to
  // pending — only an actual change resets verification.
  if (current?.customDomain === domain) return { ok: true };

  try {
    await db
      .update(stores)
      .set({ customDomain: domain, customDomainVerifiedAt: null, updatedAt: new Date() })
      .where(eq(stores.id, session.user.storeId));
  } catch (err) {
    if (isUniqueViolation(err, "stores_custom_domain_idx")) {
      return { error: "That domain is already connected to another store." };
    }
    throw err;
  }

  revalidatePath("/domain-settings");
  return { ok: true };
}

// Zero params: useActionState still invokes it with (prevState, formData),
// but neither is needed here (the domain lives in the store row).
export async function verifyDomainAction(): Promise<DomainActionState> {
  const session = await requireRole("admin");

  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  if (!store?.customDomain) return { error: "Add a domain first." };

  const slugHost = slugHostFor(store);
  if (!slugHost) return { error: "Platform domain isn't configured." };

  const result = await verifyCustomDomainDns(store.customDomain, {
    slugHost,
    platformRootDomain: process.env.PLATFORM_ROOT_DOMAIN,
    platformIps: platformIpsFromEnv(),
  });
  if (!result.ok) return { error: result.detail };

  await db
    .update(stores)
    .set({ customDomainVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/domain-settings");
  return { ok: true };
}

export async function removeDomainAction(): Promise<DomainActionState> {
  const session = await requireRole("admin");

  await db
    .update(stores)
    .set({ customDomain: null, customDomainVerifiedAt: null, updatedAt: new Date() })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/domain-settings");
  return { ok: true };
}
