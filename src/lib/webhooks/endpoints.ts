import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { webhookDeliveries, webhookEndpoints } from "@/db/schema";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secret";
import { parseEvents, serializeEvents, type WebhookEvent } from "./events";

// CRUD for a store's webhook endpoints. webhook_endpoints IS an RLS table
// (see src/db/schema/webhook-endpoints.ts) — every call runs inside
// withStoreContext and also carries an explicit `where store_id = ?` as
// the app-layer guard (CLAUDE.md rule #1).

export type WebhookEndpointView = {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  disabledAt: Date | null;
  createdAt: Date;
};

// Validate a merchant-entered endpoint URL: absolute http(s), no fragment.
export function normalizeWebhookUrl(raw: string): string | null {
  const candidate = raw.trim();
  if (!candidate) return null;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.hash) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function createEndpoint(
  storeId: string,
  input: { url: string; events: WebhookEvent[]; staffId: string | null }
): Promise<{ id: string }> {
  const url = normalizeWebhookUrl(input.url);
  if (!url) throw new Error("webhooks: a valid http(s) URL is required");
  const events = parseEvents(input.events);
  if (events.length === 0) throw new Error("webhooks: at least one valid event is required");

  const secret = `whsec_${randomBytes(24).toString("base64url")}`;

  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .insert(webhookEndpoints)
      .values({
        storeId,
        url,
        secret: encryptSecret(secret),
        events: serializeEvents(events),
        createdByStaffId: input.staffId,
      })
      .returning({ id: webhookEndpoints.id })
  );
  return { id: row.id };
}

export async function listEndpoints(storeId: string): Promise<WebhookEndpointView[]> {
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.storeId, storeId))
      .orderBy(desc(webhookEndpoints.createdAt))
  );
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    events: parseEvents(r.events),
    secret: safeDecrypt(r.secret),
    disabledAt: r.disabledAt,
    createdAt: r.createdAt,
  }));
}

export async function setEndpointEnabled(
  storeId: string,
  id: string,
  enabled: boolean
): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .update(webhookEndpoints)
      .set({ disabledAt: enabled ? null : new Date() })
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.storeId, storeId)))
  );
}

export async function deleteEndpoint(storeId: string, id: string): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.storeId, storeId)))
  );
}

export type WebhookDeliveryView = {
  id: string;
  endpointId: string;
  endpointUrl: string | null;
  event: string;
  status: "success" | "failed";
  attempts: number;
  responseStatus: number | null;
  error: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
};

export async function listRecentDeliveries(
  storeId: string,
  limit = 20
): Promise<WebhookDeliveryView[]> {
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: webhookDeliveries.id,
        endpointId: webhookDeliveries.endpointId,
        endpointUrl: webhookEndpoints.url,
        event: webhookDeliveries.event,
        status: webhookDeliveries.status,
        attempts: webhookDeliveries.attempts,
        responseStatus: webhookDeliveries.responseStatus,
        error: webhookDeliveries.error,
        createdAt: webhookDeliveries.createdAt,
        deliveredAt: webhookDeliveries.deliveredAt,
      })
      .from(webhookDeliveries)
      .leftJoin(webhookEndpoints, eq(webhookEndpoints.id, webhookDeliveries.endpointId))
      .where(eq(webhookDeliveries.storeId, storeId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
  );
  return rows;
}

// A stored secret that predates APP_SECRET_KEY, or a corrupt row, must not
// take the whole settings page down — show a placeholder instead.
function safeDecrypt(ciphertext: string): string {
  try {
    return decryptSecret(ciphertext);
  } catch {
    return "";
  }
}
