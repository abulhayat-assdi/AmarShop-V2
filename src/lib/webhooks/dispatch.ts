import { createHmac, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, webhookDeliveries, webhookEndpoints } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto/secret";
import { orderToDto } from "@/lib/api/dto";
import { parseEvents, type WebhookEvent } from "./events";

// Outbound webhook delivery. emitWebhook() is fired from a Server Action's
// after() hook and mirrors sendOrderSms(): it NEVER throws, is a no-op when
// nothing is configured, and records every attempt in webhook_deliveries.
//
// Retry policy (user decision, 2026-09-01): 3 inline attempts spaced
// 0 / 2s / 8s, all within the after() window; a still-failing delivery is
// left as a `failed` row with a "Resend" button in the admin. No queue.

const RETRY_DELAYS_MS = [0, 2_000, 8_000];
const ATTEMPT_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BODY = 500;

export function sign(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

type PreparedDelivery = {
  deliveryId: string;
  url: string;
  secret: string;
  event: string;
  body: string;
  priorAttempts: number;
};

type DeliveryOutcome = { status: "success" | "failed" };

// Try one prepared delivery up to 3 times, then write the final result to
// its webhook_deliveries row. Own short store-context write — the HTTP is
// deliberately NOT inside a transaction.
async function deliverWithRetries(
  storeId: string,
  d: PreparedDelivery
): Promise<DeliveryOutcome> {
  let attempts = d.priorAttempts;
  let lastStatus: number | null = null;
  let lastBody: string | null = null;
  let lastError: string | null = null;

  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    if (RETRY_DELAYS_MS[i] > 0) await sleep(RETRY_DELAYS_MS[i]);
    attempts++;
    try {
      const res = await fetch(d.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "AmarShop-Webhooks/1",
          "X-AmarShop-Event": d.event,
          "X-AmarShop-Delivery": d.deliveryId,
          "X-AmarShop-Signature": sign(d.body, d.secret),
        },
        body: d.body,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        redirect: "manual",
      });
      const text = await safeReadBody(res);
      if (res.ok) {
        await finalize(storeId, d.deliveryId, {
          status: "success",
          attempts,
          responseStatus: res.status,
          responseBody: text,
          error: null,
          deliveredAt: new Date(),
        });
        return { status: "success" };
      }
      lastStatus = res.status;
      lastBody = text;
      lastError = null;
    } catch (err) {
      lastStatus = null;
      lastBody = null;
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  await finalize(storeId, d.deliveryId, {
    status: "failed",
    attempts,
    responseStatus: lastStatus,
    responseBody: lastBody,
    error: lastError,
    deliveredAt: null,
  });
  return { status: "failed" };
}

async function finalize(
  storeId: string,
  deliveryId: string,
  set: {
    status: "success" | "failed";
    attempts: number;
    responseStatus: number | null;
    responseBody: string | null;
    error: string | null;
    deliveredAt: Date | null;
  }
): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .update(webhookDeliveries)
      .set(set)
      .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.storeId, storeId)))
  );
}

// Fire-and-forget from after(). Loads the store's enabled endpoints that
// want `event`, snapshots the order as the same OrderDto the public API
// returns, records one delivery row per endpoint, then delivers them
// concurrently. Any failure is swallowed and logged.
export async function emitWebhook(
  storeId: string,
  event: WebhookEvent,
  ctx: { orderId: string }
): Promise<void> {
  try {
    const prepared = await withStoreContext(storeId, async (tx): Promise<PreparedDelivery[]> => {
      const endpoints = await tx
        .select()
        .from(webhookEndpoints)
        .where(and(eq(webhookEndpoints.storeId, storeId), isNull(webhookEndpoints.disabledAt)));
      const subscribed = endpoints.filter((e) => parseEvents(e.events).includes(event));
      if (subscribed.length === 0) return [];

      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.storeId, storeId), eq(orders.id, ctx.orderId)))
        .limit(1);
      // Quota-locked orders are redacted everywhere the merchant can see
      // them (admin + /api/v1) — a webhook must not leak them either.
      if (!order || order.quotaLockedAt) return [];

      const items = await tx
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, ctx.orderId)));

      const dto = orderToDto(order, items);

      const out: PreparedDelivery[] = [];
      for (const endpoint of subscribed) {
        const deliveryId = randomUUID();
        const body = JSON.stringify({
          id: deliveryId,
          event,
          createdAt: new Date().toISOString(),
          data: dto,
        });
        await tx.insert(webhookDeliveries).values({
          id: deliveryId,
          storeId,
          endpointId: endpoint.id,
          event,
          payload: body,
          status: "failed",
          attempts: 0,
        });
        out.push({
          deliveryId,
          url: endpoint.url,
          secret: safeDecrypt(endpoint.secret),
          event,
          body,
          priorAttempts: 0,
        });
      }
      return out;
    });

    if (prepared.length === 0) return;
    await Promise.all(prepared.map((d) => deliverWithRetries(storeId, d)));
  } catch (err) {
    console.error(`[webhooks] emitWebhook crashed for order ${ctx.orderId} (${event})`, err);
  }
}

export type ResendResult =
  | { ok: true; status: "success" | "failed" }
  | { ok: false; reason: "not_found" | "endpoint_unavailable" };

// Re-run an existing (typically failed) delivery against its endpoint,
// replaying the stored payload byte-for-byte. Attempts keep accumulating.
export async function resendDelivery(
  storeId: string,
  deliveryId: string
): Promise<ResendResult> {
  let prepared: PreparedDelivery | null = null;
  try {
    prepared = await withStoreContext(storeId, async (tx): Promise<PreparedDelivery | null> => {
      const [row] = await tx
        .select({
          id: webhookDeliveries.id,
          event: webhookDeliveries.event,
          payload: webhookDeliveries.payload,
          attempts: webhookDeliveries.attempts,
          url: webhookEndpoints.url,
          secret: webhookEndpoints.secret,
          disabledAt: webhookEndpoints.disabledAt,
        })
        .from(webhookDeliveries)
        .leftJoin(webhookEndpoints, eq(webhookEndpoints.id, webhookDeliveries.endpointId))
        .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.storeId, storeId)))
        .limit(1);
      if (!row) return null;
      if (!row.url || row.disabledAt) throw new EndpointUnavailable();
      return {
        deliveryId: row.id,
        url: row.url,
        secret: safeDecrypt(row.secret ?? ""),
        event: row.event,
        body: row.payload,
        priorAttempts: row.attempts,
      };
    });
  } catch (err) {
    if (err instanceof EndpointUnavailable) return { ok: false, reason: "endpoint_unavailable" };
    throw err;
  }

  if (!prepared) return { ok: false, reason: "not_found" };
  const { status } = await deliverWithRetries(storeId, prepared);
  return { ok: true, status };
}

class EndpointUnavailable extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeReadBody(res: Response): Promise<string | null> {
  try {
    const text = await res.text();
    return text ? text.slice(0, MAX_RESPONSE_BODY) : null;
  } catch {
    return null;
  }
}

function safeDecrypt(ciphertext: string): string {
  try {
    return decryptSecret(ciphertext);
  } catch {
    return "";
  }
}
