import { eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { storeCourierSettings } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";
import type { CourierConfig, CourierCredentials, CourierProvider } from "./types";

type SecretsBlob = Partial<Record<CourierProvider, CourierCredentials>>;

function parseSecrets(ciphertext: string | null | undefined): SecretsBlob {
  if (!ciphertext) return {};
  try {
    const parsed = JSON.parse(decryptSecret(ciphertext));
    return parsed && typeof parsed === "object" ? (parsed as SecretsBlob) : {};
  } catch {
    return {};
  }
}

export type CourierSettingsView = {
  activeProvider: CourierProvider | null;
  sandbox: boolean;
  // Which providers currently have at least one saved credential — the
  // form uses this to show "•••• saved" instead of a blank field, and to
  // decide the credential values themselves are never sent to the client.
  configuredProviders: CourierProvider[];
};

export async function getCourierSettingsView(storeId: string): Promise<CourierSettingsView> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(storeCourierSettings)
      .where(eq(storeCourierSettings.storeId, storeId))
      .limit(1)
  );
  const secrets = parseSecrets(row?.secrets);
  return {
    activeProvider: row?.activeProvider ?? null,
    sandbox: row?.sandbox ?? true,
    configuredProviders: (Object.keys(secrets) as CourierProvider[]).filter(
      (p) => Object.keys(secrets[p] ?? {}).length > 0
    ),
  };
}

// Resolve a SPECIFIC provider's saved credentials (null when that provider
// has none). The store keeps credentials for every provider it has ever
// configured, so a merchant can book with any of them — activeProvider is
// just the picker's default. Used by bookShipment(…, provider) and by
// refresh/cancel (which resolve by the shipment's OWN provider).
export async function getCourierConfigFor(
  storeId: string,
  provider: CourierProvider
): Promise<{ provider: CourierProvider; config: CourierConfig } | null> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(storeCourierSettings)
      .where(eq(storeCourierSettings.storeId, storeId))
      .limit(1)
  );
  if (!row) return null;
  const creds = parseSecrets(row.secrets)[provider];
  if (!creds || Object.keys(creds).length === 0) return null;
  return { provider, config: { sandbox: row.sandbox, credentials: creds } };
}

// Used by the shipment service to build the store's default adapter.
export async function getActiveCourierConfig(
  storeId: string
): Promise<{ provider: CourierProvider; config: CourierConfig } | null> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select({ activeProvider: storeCourierSettings.activeProvider })
      .from(storeCourierSettings)
      .where(eq(storeCourierSettings.storeId, storeId))
      .limit(1)
  );
  if (!row?.activeProvider) return null;
  return getCourierConfigFor(storeId, row.activeProvider);
}

export async function saveCourierSettings(
  storeId: string,
  input: {
    activeProvider: CourierProvider | null;
    sandbox: boolean;
    // per-provider field updates; a blank/whitespace value means "leave the
    // stored value unchanged" so the form never has to echo secrets back.
    credentialUpdates: Partial<Record<CourierProvider, CourierCredentials>>;
  }
): Promise<void> {
  await withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(storeCourierSettings)
      .where(eq(storeCourierSettings.storeId, storeId))
      .limit(1);

    const secrets = parseSecrets(existing?.secrets);
    for (const [provider, updates] of Object.entries(input.credentialUpdates)) {
      const current = { ...(secrets[provider as CourierProvider] ?? {}) };
      for (const [key, value] of Object.entries(updates ?? {})) {
        if (typeof value === "string" && value.trim() !== "") current[key] = value.trim();
      }
      secrets[provider as CourierProvider] = current;
    }

    const ciphertext = encryptSecret(JSON.stringify(secrets));
    if (existing) {
      await tx
        .update(storeCourierSettings)
        .set({
          activeProvider: input.activeProvider,
          sandbox: input.sandbox,
          secrets: ciphertext,
          updatedAt: new Date(),
        })
        .where(eq(storeCourierSettings.id, existing.id));
    } else {
      await tx.insert(storeCourierSettings).values({
        storeId,
        activeProvider: input.activeProvider,
        sandbox: input.sandbox,
        secrets: ciphertext,
      });
    }
  });
}
