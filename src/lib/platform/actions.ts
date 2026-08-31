"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stores, type Store } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/roles";
import { STORE_STATUSES, SUBSCRIPTION_STATUSES } from "@/lib/enum-labels";
import { isValidPlanId } from "@/lib/billing/plans";
import { applyPaidPlan } from "@/lib/billing/subscription";
import { isReservedSubdomain } from "@/lib/tenant/constants";
import { normalizeGa4Id, normalizeMetaPixelId } from "@/lib/analytics/config";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

// Platform-operator actions on any tenant — cross-tenant by design, gated
// by requirePlatformAdmin(). Not storeId-scoped to the caller.

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function revalidateStore(storeId: string) {
  revalidatePath(`/platform/stores/${storeId}`);
  revalidatePath("/platform");
}

export async function setStoreStatusAction(storeId: string, status: string) {
  await requirePlatformAdmin();
  if (!(STORE_STATUSES as string[]).includes(status)) return;
  await db
    .update(stores)
    .set({ status: status as Store["status"], updatedAt: new Date() })
    .where(eq(stores.id, storeId));
  revalidateStore(storeId);
}

export async function setSubscriptionStatusAction(storeId: string, status: string) {
  await requirePlatformAdmin();
  if (!(SUBSCRIPTION_STATUSES as string[]).includes(status)) return;
  await db
    .update(stores)
    .set({ subscriptionStatus: status as Store["subscriptionStatus"], updatedAt: new Date() })
    .where(eq(stores.id, storeId));
  revalidateStore(storeId);
}

// Grant a store a plan directly, no invoice — for comping a merchant or
// fixing a botched payment. Flips it to `active` for `months` and unlocks
// any quota-locked orders (via applyPaidPlan).
export async function overrideSubscriptionAction(storeId: string, formData: FormData) {
  await requirePlatformAdmin();

  const plan = String(formData.get("plan") ?? "");
  if (!isValidPlanId(plan)) return;
  const monthsRaw = Number(String(formData.get("months") ?? "1"));
  const months = Number.isInteger(monthsRaw) && monthsRaw >= 1 && monthsRaw <= 36 ? monthsRaw : 1;

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + months);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_store_id', ${storeId}, true)`);
    await applyPaidPlan(tx, storeId, { plan, cycle: "monthly", periodEnd });
  });
  revalidateStore(storeId);
}

export type StoreSettingsState = { error?: MessageRef; ok?: boolean };

// Store-level settings a platform admin can edit from the detail page.
// Product/order data stays the merchant's to manage.
export async function updateStoreSettingsAction(
  storeId: string,
  _prev: StoreSettingsState,
  formData: FormData
): Promise<StoreSettingsState> {
  await requirePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: msg("platform.settings.errName") };

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug) || isReservedSubdomain(slug)) {
    return { error: msg("platform.settings.errSlug") };
  }
  const [clash] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(and(eq(stores.slug, slug), ne(stores.id, storeId)))
    .limit(1);
  if (clash) return { error: msg("platform.settings.errSlugTaken") };

  const locale = String(formData.get("locale") ?? "bn");
  if (locale !== "bn" && locale !== "en") return { error: msg("platform.settings.errLocale") };

  const th = Number(String(formData.get("lowStockThreshold") ?? "").trim());
  if (!Number.isInteger(th) || th < 0 || th > 100000) {
    return { error: msg("platform.settings.errNumber") };
  }

  const digitalEnabled = formData.get("digitalEnabled") === "on";

  const pixelRaw = String(formData.get("metaPixelId") ?? "").trim();
  const metaPixelId = normalizeMetaPixelId(pixelRaw);
  if (pixelRaw && !metaPixelId) return { error: msg("platform.settings.errPixel") };

  const ga4Raw = String(formData.get("ga4MeasurementId") ?? "").trim();
  const ga4MeasurementId = normalizeGa4Id(ga4Raw);
  if (ga4Raw && !ga4MeasurementId) return { error: msg("platform.settings.errGa4") };

  await db
    .update(stores)
    .set({
      name,
      slug,
      locale,
      lowStockThreshold: th,
      digitalEnabled,
      metaPixelId,
      ga4MeasurementId,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId));

  revalidateStore(storeId);
  return { ok: true };
}

// Hard delete — every child FK is onDelete: cascade, so this erases the
// whole tenant (orders, products, customers, everything). Guarded by
// requiring the operator to re-type the store's slug.
export async function deleteStoreAction(storeId: string, formData: FormData) {
  await requirePlatformAdmin();
  const [store] = await db
    .select({ slug: stores.slug })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store) return;
  if (String(formData.get("confirmSlug") ?? "").trim() !== store.slug) {
    revalidatePath(`/platform/stores/${storeId}`);
    return;
  }
  await db.delete(stores).where(eq(stores.id, storeId));
  redirect("/platform");
}
