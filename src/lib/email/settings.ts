import { eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { storeEmailSettings } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import type { EmailConfig, EmailCredentials, EmailProvider } from "./types";

type SecretsBlob = Partial<Record<EmailProvider, EmailCredentials>>;

function parseSecrets(ciphertext: string | null | undefined): SecretsBlob {
  if (!ciphertext) return {};
  try {
    const parsed = JSON.parse(decryptSecret(ciphertext));
    return parsed && typeof parsed === "object" ? (parsed as SecretsBlob) : {};
  } catch {
    return {};
  }
}

export type EmailSettingsView = {
  provider: EmailProvider | null;
  fromName: string | null;
  fromEmail: string | null;
  host: string | null;
  port: number | null;
  secure: boolean;
  // Providers with at least one saved credential — the form shows "••••
  // saved" instead of a blank field; secret values never reach the client.
  configuredProviders: EmailProvider[];
};

export async function getEmailSettingsView(storeId: string): Promise<EmailSettingsView> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx.select().from(storeEmailSettings).where(eq(storeEmailSettings.storeId, storeId)).limit(1)
  );
  const secrets = parseSecrets(row?.secrets);
  return {
    provider: row?.provider ?? null,
    fromName: row?.fromName ?? null,
    fromEmail: row?.fromEmail ?? null,
    host: row?.host ?? null,
    port: row?.port ?? null,
    secure: row?.secure ?? false,
    configuredProviders: (Object.keys(secrets) as EmailProvider[]).filter(
      (p) => Object.keys(secrets[p] ?? {}).length > 0
    ),
  };
}

export type ActiveEmailConfig = {
  provider: EmailProvider;
  config: EmailConfig;
};

// Used by the "Send test email" action to build the active adapter. null
// when no provider is switched on.
export async function getActiveEmailConfig(storeId: string): Promise<ActiveEmailConfig | null> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx.select().from(storeEmailSettings).where(eq(storeEmailSettings.storeId, storeId)).limit(1)
  );
  if (!row?.provider) return null;
  const secrets = parseSecrets(row.secrets);
  return {
    provider: row.provider,
    config: {
      host: row.host ?? "",
      port: row.port ?? 587,
      secure: row.secure,
      fromName: row.fromName,
      fromEmail: row.fromEmail ?? "",
      credentials: secrets[row.provider] ?? {},
    },
  };
}

export async function saveEmailSettings(
  storeId: string,
  input: {
    provider: EmailProvider | null;
    fromName: string | null;
    fromEmail: string | null;
    host: string | null;
    port: number | null;
    secure: boolean;
    // blank / whitespace value = leave the stored value unchanged.
    credentialUpdates: Partial<Record<EmailProvider, EmailCredentials>>;
  }
): Promise<void> {
  await withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(storeEmailSettings)
      .where(eq(storeEmailSettings.storeId, storeId))
      .limit(1);

    const secrets = parseSecrets(existing?.secrets);
    for (const [provider, updates] of Object.entries(input.credentialUpdates)) {
      const current = { ...(secrets[provider as EmailProvider] ?? {}) };
      for (const [key, value] of Object.entries(updates ?? {})) {
        if (typeof value === "string" && value.trim() !== "") current[key] = value.trim();
      }
      secrets[provider as EmailProvider] = current;
    }
    const ciphertext = encryptSecret(JSON.stringify(secrets));

    const values = {
      provider: input.provider,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      host: input.host,
      port: input.port,
      secure: input.secure,
      secrets: ciphertext,
    };

    if (existing) {
      await tx
        .update(storeEmailSettings)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(storeEmailSettings.id, existing.id));
    } else {
      await tx.insert(storeEmailSettings).values({ storeId, ...values });
    }
  });
}
