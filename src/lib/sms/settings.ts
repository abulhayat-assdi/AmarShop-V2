import { eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { storeSmsSettings } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import type { SmsConfig, SmsCredentials, SmsProvider } from "./types";

type SecretsBlob = Partial<Record<SmsProvider, SmsCredentials>>;

function parseSecrets(ciphertext: string | null | undefined): SecretsBlob {
  if (!ciphertext) return {};
  try {
    const parsed = JSON.parse(decryptSecret(ciphertext));
    return parsed && typeof parsed === "object" ? (parsed as SecretsBlob) : {};
  } catch {
    return {};
  }
}

export type SmsSettingsView = {
  provider: SmsProvider | null;
  senderId: string | null;
  sandbox: boolean;
  notifyOrderPlaced: boolean;
  notifyOrderShipped: boolean;
  // Providers with at least one saved credential — the form shows "••••
  // saved" instead of a blank field; secret values never reach the client.
  configuredProviders: SmsProvider[];
};

export async function getSmsSettingsView(storeId: string): Promise<SmsSettingsView> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx.select().from(storeSmsSettings).where(eq(storeSmsSettings.storeId, storeId)).limit(1)
  );
  const secrets = parseSecrets(row?.secrets);
  return {
    provider: row?.provider ?? null,
    senderId: row?.senderId ?? null,
    sandbox: row?.sandbox ?? true,
    notifyOrderPlaced: row?.notifyOrderPlaced ?? true,
    notifyOrderShipped: row?.notifyOrderShipped ?? true,
    configuredProviders: (Object.keys(secrets) as SmsProvider[]).filter(
      (p) => Object.keys(secrets[p] ?? {}).length > 0
    ),
  };
}

export type ActiveSmsConfig = {
  provider: SmsProvider;
  config: SmsConfig;
  senderId: string | null;
  notifyOrderPlaced: boolean;
  notifyOrderShipped: boolean;
};

// Used by the notification service to build the active adapter. null when
// no provider is switched on.
export async function getActiveSmsConfig(storeId: string): Promise<ActiveSmsConfig | null> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx.select().from(storeSmsSettings).where(eq(storeSmsSettings.storeId, storeId)).limit(1)
  );
  if (!row?.provider) return null;
  const secrets = parseSecrets(row.secrets);
  return {
    provider: row.provider,
    config: { sandbox: row.sandbox, credentials: secrets[row.provider] ?? {} },
    senderId: row.senderId,
    notifyOrderPlaced: row.notifyOrderPlaced,
    notifyOrderShipped: row.notifyOrderShipped,
  };
}

export async function saveSmsSettings(
  storeId: string,
  input: {
    provider: SmsProvider | null;
    senderId: string | null;
    sandbox: boolean;
    notifyOrderPlaced: boolean;
    notifyOrderShipped: boolean;
    // blank / whitespace value = leave the stored value unchanged.
    credentialUpdates: Partial<Record<SmsProvider, SmsCredentials>>;
  }
): Promise<void> {
  await withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(storeSmsSettings)
      .where(eq(storeSmsSettings.storeId, storeId))
      .limit(1);

    const secrets = parseSecrets(existing?.secrets);
    for (const [provider, updates] of Object.entries(input.credentialUpdates)) {
      const current = { ...(secrets[provider as SmsProvider] ?? {}) };
      for (const [key, value] of Object.entries(updates ?? {})) {
        if (typeof value === "string" && value.trim() !== "") current[key] = value.trim();
      }
      secrets[provider as SmsProvider] = current;
    }
    const ciphertext = encryptSecret(JSON.stringify(secrets));

    const values = {
      provider: input.provider,
      senderId: input.senderId,
      sandbox: input.sandbox,
      notifyOrderPlaced: input.notifyOrderPlaced,
      notifyOrderShipped: input.notifyOrderShipped,
      secrets: ciphertext,
    };

    if (existing) {
      await tx
        .update(storeSmsSettings)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(storeSmsSettings.id, existing.id));
    } else {
      await tx.insert(storeSmsSettings).values({ storeId, ...values });
    }
  });
}
