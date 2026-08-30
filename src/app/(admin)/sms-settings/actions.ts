"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { saveSmsSettings } from "@/lib/sms/settings";
import { SMS_PROVIDERS, SMS_PROVIDER_CREDENTIAL_FIELDS } from "@/lib/sms/providers";
import type { SmsCredentials, SmsProvider } from "@/lib/sms/types";

export type SmsSettingsState = { error?: string; ok?: boolean };

export async function saveSmsSettingsAction(
  _prev: SmsSettingsState,
  formData: FormData
): Promise<SmsSettingsState> {
  const session = await requireRole("admin");

  const rawProvider = String(formData.get("provider") ?? "");
  const provider: SmsProvider | null = (SMS_PROVIDERS as string[]).includes(rawProvider)
    ? (rawProvider as SmsProvider)
    : null;
  const senderId = String(formData.get("senderId") ?? "").trim() || null;
  const sandbox = formData.get("sandbox") === "on";
  const notifyOrderPlaced = formData.get("notifyOrderPlaced") === "on";
  const notifyOrderShipped = formData.get("notifyOrderShipped") === "on";

  const credentialUpdates: Partial<Record<SmsProvider, SmsCredentials>> = {};
  for (const p of SMS_PROVIDERS) {
    const updates: SmsCredentials = {};
    for (const field of SMS_PROVIDER_CREDENTIAL_FIELDS[p]) {
      const value = String(formData.get(`cred.${p}.${field.key}`) ?? "");
      if (value.trim() !== "") updates[field.key] = value;
    }
    if (Object.keys(updates).length > 0) credentialUpdates[p] = updates;
  }

  try {
    await saveSmsSettings(session.user.storeId, {
      provider,
      senderId,
      sandbox,
      notifyOrderPlaced,
      notifyOrderShipped,
      credentialUpdates,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save SMS settings." };
  }

  revalidatePath("/sms-settings");
  return { ok: true };
}
