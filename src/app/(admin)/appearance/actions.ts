"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { isRealFile, removeStoreLogo, setStoreLogo, validateLogoFile } from "@/lib/appearance/logo";

export type AppearanceState = { error?: string; ok?: boolean };

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
// Lenient — just enough to catch a typo, not a full URL validator (matches
// the leniency of EMAIL_PATTERN in support/actions.ts).
const URL_PATTERN = /^https?:\/\/\S+$/;

// stores is outside the RLS boundary — write via `db` directly, scoped by
// the session's own storeId, like every other stores.* settings action.
export async function updateAppearanceAction(
  _prev: AppearanceState,
  formData: FormData
): Promise<AppearanceState> {
  const session = await requirePermission("settings:manage");

  const colorRaw = String(formData.get("primaryColor") ?? "").trim();
  const taglineRaw = String(formData.get("footerTagline") ?? "").trim();
  const whatsappRaw = String(formData.get("socialWhatsapp") ?? "").trim();
  const facebookRaw = String(formData.get("socialFacebook") ?? "").trim();
  const instagramRaw = String(formData.get("socialInstagram") ?? "").trim();

  if (colorRaw !== "" && !HEX_COLOR_PATTERN.test(colorRaw)) {
    return { error: "admin.appearance.errColor" };
  }
  if (whatsappRaw !== "" && !URL_PATTERN.test(whatsappRaw)) {
    return { error: "admin.appearance.errSocialWhatsapp" };
  }
  if (facebookRaw !== "" && !URL_PATTERN.test(facebookRaw)) {
    return { error: "admin.appearance.errSocialFacebook" };
  }
  if (instagramRaw !== "" && !URL_PATTERN.test(instagramRaw)) {
    return { error: "admin.appearance.errSocialInstagram" };
  }

  const logo = formData.get("logo");
  if (isRealFile(logo)) {
    const logoErr = validateLogoFile(logo);
    if (logoErr) return { error: logoErr };
  }

  await db
    .update(stores)
    .set({
      primaryColor: colorRaw || null,
      footerTagline: taglineRaw || null,
      socialWhatsapp: whatsappRaw || null,
      socialFacebook: facebookRaw || null,
      socialInstagram: instagramRaw || null,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, session.user.storeId));

  if (isRealFile(logo)) await setStoreLogo(session.user.storeId, logo);

  revalidatePath("/appearance");
  return { ok: true };
}

export async function removeStoreLogoAction(): Promise<void> {
  const session = await requirePermission("settings:manage");
  await removeStoreLogo(session.user.storeId);
  revalidatePath("/appearance");
}
