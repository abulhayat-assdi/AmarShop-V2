"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import { saveCourierSettings } from "@/lib/courier/settings";
import { COURIER_CREDENTIAL_FIELDS, COURIER_PROVIDERS } from "@/lib/courier/providers";
import type { CourierCredentials, CourierProvider } from "@/lib/courier/types";

export type CourierSettingsState = { error?: string; ok?: boolean };

export async function saveCourierSettingsAction(
  _prev: CourierSettingsState,
  formData: FormData
): Promise<CourierSettingsState> {
  const session = await requirePermission("courier:manage");

  const rawProvider = String(formData.get("activeProvider") ?? "");
  const activeProvider: CourierProvider | null = (COURIER_PROVIDERS as string[]).includes(rawProvider)
    ? (rawProvider as CourierProvider)
    : null;
  const sandbox = formData.get("sandbox") === "on";

  const credentialUpdates: Partial<Record<CourierProvider, CourierCredentials>> = {};
  for (const provider of COURIER_PROVIDERS) {
    const updates: CourierCredentials = {};
    for (const field of COURIER_CREDENTIAL_FIELDS[provider]) {
      const value = String(formData.get(`cred.${provider}.${field.key}`) ?? "");
      if (value.trim() !== "") updates[field.key] = value;
    }
    if (Object.keys(updates).length > 0) credentialUpdates[provider] = updates;
  }

  try {
    await saveCourierSettings(session.user.storeId, { activeProvider, sandbox, credentialUpdates });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save courier settings." };
  }

  revalidatePath("/courier-settings");
  return { ok: true };
}
