"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import { saveEmailSettings } from "@/lib/email/settings";
import { sendTestEmail } from "@/lib/email/send-test";
import { EMAIL_PROVIDERS, EMAIL_PROVIDER_CREDENTIAL_FIELDS } from "@/lib/email/providers";
import type { EmailCredentials, EmailProvider } from "@/lib/email/types";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

// Lenient, same shape as EMAIL_PATTERN in support/actions.ts / appearance.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailSettingsState = { error?: string; ok?: boolean };

export async function saveEmailSettingsAction(
  _prev: EmailSettingsState,
  formData: FormData
): Promise<EmailSettingsState> {
  const session = await requirePermission("email_settings:manage");

  const rawProvider = String(formData.get("provider") ?? "");
  const provider: EmailProvider | null = (EMAIL_PROVIDERS as string[]).includes(rawProvider)
    ? (rawProvider as EmailProvider)
    : null;
  const fromName = String(formData.get("fromName") ?? "").trim() || null;
  const fromEmail = String(formData.get("fromEmail") ?? "").trim() || null;
  const host = String(formData.get("host") ?? "").trim() || null;
  const portRaw = String(formData.get("port") ?? "").trim();
  const port = portRaw !== "" && Number.isInteger(Number(portRaw)) ? Number(portRaw) : null;
  const secure = formData.get("secure") === "on";

  if (fromEmail && !EMAIL_PATTERN.test(fromEmail)) {
    return { error: "admin.emailGateways.errFromEmail" };
  }

  const credentialUpdates: Partial<Record<EmailProvider, EmailCredentials>> = {};
  for (const p of EMAIL_PROVIDERS) {
    const updates: EmailCredentials = {};
    for (const field of EMAIL_PROVIDER_CREDENTIAL_FIELDS[p]) {
      const value = String(formData.get(`cred.${p}.${field.key}`) ?? "");
      if (value.trim() !== "") updates[field.key] = value;
    }
    if (Object.keys(updates).length > 0) credentialUpdates[p] = updates;
  }

  try {
    await saveEmailSettings(session.user.storeId, {
      provider,
      fromName,
      fromEmail,
      host,
      port,
      secure,
      credentialUpdates,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save email settings." };
  }

  revalidatePath("/email-gateways");
  return { ok: true };
}

export type SendTestState = { ok?: boolean; error?: MessageRef };

export async function sendTestEmailAction(
  _prev: SendTestState,
  formData: FormData
): Promise<SendTestState> {
  const session = await requirePermission("email_settings:manage");
  const to = String(formData.get("to") ?? "").trim();
  if (!EMAIL_PATTERN.test(to)) return { error: msg("admin.emailGateways.errTestEmail") };

  const result = await sendTestEmail(session.user.storeId, to);
  if ("error" in result) return { error: result.error };

  revalidatePath("/email-gateways");
  return { ok: true };
}
