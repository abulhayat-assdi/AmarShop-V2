"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import { createRedirect, deleteRedirect, updateRedirect } from "@/lib/redirects/manage";

// URL Redirects is storefront configuration, like Appearance / Menu
// Builder / Checkout Settings — it reuses their `settings:manage`
// permission rather than minting a new one.
export type RedirectState = { error?: string; ok?: boolean };

function parse(formData: FormData) {
  return {
    fromPath: String(formData.get("fromPath") ?? ""),
    toTarget: String(formData.get("toTarget") ?? ""),
    statusCode: Number(formData.get("statusCode") ?? 301),
    active: formData.get("active") != null,
  };
}

export async function addRedirectAction(
  _prev: RedirectState,
  formData: FormData
): Promise<RedirectState> {
  const session = await requirePermission("settings:manage");
  const result = await createRedirect(session.user.storeId, parse(formData));
  if ("error" in result) return { error: result.error };
  revalidatePath("/redirects");
  return { ok: true };
}

export async function updateRedirectAction(
  redirectId: string,
  _prev: RedirectState,
  formData: FormData
): Promise<RedirectState> {
  const session = await requirePermission("settings:manage");
  const result = await updateRedirect(session.user.storeId, redirectId, parse(formData));
  if ("error" in result) return { error: result.error };
  revalidatePath("/redirects");
  return { ok: true };
}

export async function deleteRedirectAction(redirectId: string): Promise<void> {
  const session = await requirePermission("settings:manage");
  await deleteRedirect(session.user.storeId, redirectId);
  revalidatePath("/redirects");
}
