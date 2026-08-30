"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { normalizeGa4Id, normalizeMetaPixelId } from "@/lib/analytics/config";

export type MarketingState = { error?: string; ok?: boolean };

// stores is outside the RLS boundary — write via `db` directly, scoped by
// the session's own storeId, like domain-settings/actions.ts.
export async function saveMarketingSettingsAction(
  _prev: MarketingState,
  formData: FormData
): Promise<MarketingState> {
  const session = await requireRole("admin");

  const pixelRaw = String(formData.get("metaPixelId") ?? "").trim();
  const ga4Raw = String(formData.get("ga4MeasurementId") ?? "").trim();

  const metaPixelId = pixelRaw === "" ? null : normalizeMetaPixelId(pixelRaw);
  const ga4MeasurementId = ga4Raw === "" ? null : normalizeGa4Id(ga4Raw);

  if (pixelRaw !== "" && metaPixelId === null) return { error: "admin.marketing.errPixel" };
  if (ga4Raw !== "" && ga4MeasurementId === null) return { error: "admin.marketing.errGa4" };

  await db
    .update(stores)
    .set({ metaPixelId, ga4MeasurementId, updatedAt: new Date() })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/marketing-settings");
  return { ok: true };
}
