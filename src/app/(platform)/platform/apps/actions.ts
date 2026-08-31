"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/roles";
import { parseScopes } from "@/lib/api/scopes";
import {
  createOAuthApp,
  parseRedirectUris,
  regenerateClientSecret,
  setOAuthAppStatus,
  updateOAuthApp,
} from "@/lib/oauth/apps";
import {
  isRealFile,
  removeOAuthAppLogo,
  setOAuthAppLogo,
  validateLogoFile,
} from "@/lib/oauth/logo";

export type AppFormState = {
  error?: string;
  created?: { clientId: string; secret: string };
  secret?: string;
  ok?: boolean;
};

function readInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const developerName = String(formData.get("developerName") ?? "").trim();
  const developerEmail = String(formData.get("developerEmail") ?? "").trim();
  const homepageUrl = String(formData.get("homepageUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const redirectUris = parseRedirectUris(String(formData.get("redirectUris") ?? ""));
  const scopes = parseScopes(formData.getAll("scopes").map(String));
  return { name, developerName, developerEmail, homepageUrl, description, redirectUris, scopes };
}

function validate(input: ReturnType<typeof readInput>): string | null {
  if (!input.name) return "platform.apps.errName";
  if (!input.developerName || !input.developerEmail) return "platform.apps.errDeveloper";
  if (input.redirectUris.length === 0) return "platform.apps.errRedirect";
  if (input.scopes.length === 0) return "platform.apps.errScopes";
  return null;
}

export async function createAppAction(
  _prev: AppFormState,
  formData: FormData
): Promise<AppFormState> {
  await requirePlatformAdmin();
  const input = readInput(formData);
  const err = validate(input);
  if (err) return { error: err };

  const logo = formData.get("logo");
  if (isRealFile(logo)) {
    const logoErr = validateLogoFile(logo);
    if (logoErr) return { error: logoErr };
  }

  const created = await createOAuthApp(input);
  if (isRealFile(logo)) await setOAuthAppLogo(created.id, logo);
  revalidatePath("/platform/apps");
  return { created: { clientId: created.clientId, secret: created.secret } };
}

export async function updateAppAction(
  appId: string,
  _prev: AppFormState,
  formData: FormData
): Promise<AppFormState> {
  await requirePlatformAdmin();
  const input = readInput(formData);
  const err = validate(input);
  if (err) return { error: err };

  const logo = formData.get("logo");
  if (isRealFile(logo)) {
    const logoErr = validateLogoFile(logo);
    if (logoErr) return { error: logoErr };
  }

  await updateOAuthApp(appId, input);
  if (isRealFile(logo)) await setOAuthAppLogo(appId, logo);
  revalidatePath("/platform/apps");
  return { ok: true };
}

export async function removeAppLogoAction(appId: string): Promise<void> {
  await requirePlatformAdmin();
  await removeOAuthAppLogo(appId);
  revalidatePath("/platform/apps");
}

export async function regenerateSecretAction(appId: string): Promise<AppFormState> {
  await requirePlatformAdmin();
  const secret = await regenerateClientSecret(appId);
  revalidatePath("/platform/apps");
  return { secret };
}

export async function setAppStatusAction(appId: string, status: "active" | "disabled"): Promise<void> {
  await requirePlatformAdmin();
  await setOAuthAppStatus(appId, status);
  revalidatePath("/platform/apps");
}
