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
  };
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
    if (existing) {
      await tx
        .update(storePaymentSettings)
        .set({ sandbox: input.sandbox, secrets: ciphertext, updatedAt: new Date() })
        .where(eq(storePaymentSettings.id, existing.id));
    } else {
      await tx.insert(storePaymentSettings).values({
        storeId,
        sandbox: input.sandbox,
        secrets: ciphertext,
      });
    }
  });
}
