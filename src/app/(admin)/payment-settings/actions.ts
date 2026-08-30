"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { savePaymentSettings } from "@/lib/payments/settings";
import {
  PAYMENT_GATEWAYS,
  PAYMENT_GATEWAY_CREDENTIAL_FIELDS,
  type PaymentGateway,
} from "@/lib/payments/gateways";

export type PaymentSettingsState = { error?: string; ok?: boolean };

export async function savePaymentSettingsAction(
  _prev: PaymentSettingsState,
  formData: FormData
): Promise<PaymentSettingsState> {
  const session = await requireRole("admin");

  const sandbox = formData.get("sandbox") === "on";

  const credentialUpdates: Partial<Record<PaymentGateway, Record<string, string>>> = {};
  for (const gateway of PAYMENT_GATEWAYS) {
    const updates: Record<string, string> = {};
    for (const field of PAYMENT_GATEWAY_CREDENTIAL_FIELDS[gateway]) {
      const value = String(formData.get(`cred.${gateway}.${field.key}`) ?? "");
      if (value.trim() !== "") updates[field.key] = value;
    }
    if (Object.keys(updates).length > 0) credentialUpdates[gateway] = updates;
  }

  const manualWalletEnabled = formData.get("manualWalletEnabled") === "on";
  const bkashNumber = String(formData.get("bkashNumber") ?? "").trim() || null;
  const nagadNumber = String(formData.get("nagadNumber") ?? "").trim() || null;
  const manualInstructions = String(formData.get("manualInstructions") ?? "").trim() || null;

  try {
    await savePaymentSettings(session.user.storeId, {
      sandbox,
      credentialUpdates,
      manualWalletEnabled,
      bkashNumber,
      nagadNumber,
      manualInstructions,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save payment settings." };
  }

  revalidatePath("/payment-settings");
  return { ok: true };
}
