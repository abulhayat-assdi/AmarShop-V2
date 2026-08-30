import { eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { storePaymentSettings } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import type { SslcommerzConfig } from "./adapter";
import type { PaymentGateway } from "./gateways";

type Credentials = Record<string, string>;
type SecretsBlob = Partial<Record<PaymentGateway, Credentials>>;

function parseSecrets(ciphertext: string | null | undefined): SecretsBlob {
  if (!ciphertext) return {};
  try {
    const parsed = JSON.parse(decryptSecret(ciphertext));
    return parsed && typeof parsed === "object" ? (parsed as SecretsBlob) : {};
  } catch {
    return {};
  }
}

export type PaymentSettingsView = {
  sandbox: boolean;
  // Gateways with at least one saved credential — for the form's "saved"
  // badge. The credential values themselves never reach the client.
  configuredGateways: PaymentGateway[];
  // Manual bKash / Nagad settings — plain values, safe for the client
  // (the numbers are shown to shoppers at checkout).
  manualWalletEnabled: boolean;
  bkashNumber: string | null;
  nagadNumber: string | null;
  manualInstructions: string | null;
};

export async function getPaymentSettingsView(storeId: string): Promise<PaymentSettingsView> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(storePaymentSettings)
      .where(eq(storePaymentSettings.storeId, storeId))
      .limit(1)
  );
  const secrets = parseSecrets(row?.secrets);
  return {
    sandbox: row?.sandbox ?? true,
    configuredGateways: (Object.keys(secrets) as PaymentGateway[]).filter(
      (g) => Object.keys(secrets[g] ?? {}).length > 0
    ),
    manualWalletEnabled: row?.manualWalletEnabled ?? false,
    bkashNumber: row?.bkashNumber ?? null,
    nagadNumber: row?.nagadNumber ?? null,
    manualInstructions: row?.manualInstructions ?? null,
  };
}

export type ManualWalletConfig = {
  bkashNumber: string | null;
  nagadNumber: string | null;
  instructions: string | null;
};

// The manual bKash / Nagad option for a store's checkout, or null when the
// merchant hasn't switched it on / hasn't entered any number. Re-checked in
// placeOrder — never trust the form to say it's available.
export async function getManualWalletConfig(storeId: string): Promise<ManualWalletConfig | null> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(storePaymentSettings)
      .where(eq(storePaymentSettings.storeId, storeId))
      .limit(1)
  );
  if (!row?.manualWalletEnabled) return null;
  const bkashNumber = row.bkashNumber?.trim() || null;
  const nagadNumber = row.nagadNumber?.trim() || null;
  if (!bkashNumber && !nagadNumber) return null;
  return { bkashNumber, nagadNumber, instructions: row.manualInstructions?.trim() || null };
}

// Resolved SSLCommerz credentials for a store, or null when not fully
// configured. Used by the adapter, the checkout action, and the
// IPN / return / confirmation code.
export async function getSslcommerzConfig(storeId: string): Promise<SslcommerzConfig | null> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(storePaymentSettings)
      .where(eq(storePaymentSettings.storeId, storeId))
      .limit(1)
  );
  if (!row) return null;
  const creds = parseSecrets(row.secrets).sslcommerz;
  if (!creds?.storeId || !creds?.storePassword) return null;
  return { storeId: creds.storeId, storePassword: creds.storePassword, sandbox: row.sandbox };
}

export async function savePaymentSettings(
  storeId: string,
  input: {
    sandbox: boolean;
    // blank / whitespace value = leave the stored value unchanged.
    credentialUpdates: Partial<Record<PaymentGateway, Credentials>>;
    manualWalletEnabled: boolean;
    bkashNumber: string | null;
    nagadNumber: string | null;
    manualInstructions: string | null;
  }
): Promise<void> {
  await withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(storePaymentSettings)
      .where(eq(storePaymentSettings.storeId, storeId))
      .limit(1);

    const secrets = parseSecrets(existing?.secrets);
    for (const [gateway, updates] of Object.entries(input.credentialUpdates)) {
      const current = { ...(secrets[gateway as PaymentGateway] ?? {}) };
      for (const [key, value] of Object.entries(updates ?? {})) {
        if (typeof value === "string" && value.trim() !== "") current[key] = value.trim();
      }
      secrets[gateway as PaymentGateway] = current;
    }

    const ciphertext = encryptSecret(JSON.stringify(secrets));
    const manualFields = {
      manualWalletEnabled: input.manualWalletEnabled,
      bkashNumber: input.bkashNumber,
      nagadNumber: input.nagadNumber,
      manualInstructions: input.manualInstructions,
    };
    if (existing) {
      await tx
        .update(storePaymentSettings)
        .set({ sandbox: input.sandbox, secrets: ciphertext, ...manualFields, updatedAt: new Date() })
        .where(eq(storePaymentSettings.id, existing.id));
    } else {
      await tx.insert(storePaymentSettings).values({
        storeId,
        sandbox: input.sandbox,
        secrets: ciphertext,
        ...manualFields,
      });
    }
  });
}
