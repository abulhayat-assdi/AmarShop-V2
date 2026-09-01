"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import {
  createEndpoint,
  deleteEndpoint,
  normalizeWebhookUrl,
  setEndpointEnabled,
} from "@/lib/webhooks/endpoints";
import { resendDelivery } from "@/lib/webhooks/dispatch";
import { parseEvents } from "@/lib/webhooks/events";

export type WebhookCreateState = { error?: string; ok?: boolean };

export async function createWebhookAction(
  _prev: WebhookCreateState,
  formData: FormData
): Promise<WebhookCreateState> {
  const session = await requirePermission("webhooks:manage");

  const url = normalizeWebhookUrl(String(formData.get("url") ?? ""));
  if (!url) return { error: "admin.webhooks.errUrl" };

  const events = parseEvents(formData.getAll("events").map(String));
  if (events.length === 0) return { error: "admin.webhooks.errEvents" };

  await createEndpoint(session.user.storeId, {
    url,
    events,
    staffId: session.user.id ?? null,
  });
  revalidatePath("/webhooks");
  return { ok: true };
}

export async function setWebhookEnabledAction(id: string, enabled: boolean) {
  const session = await requirePermission("webhooks:manage");
  await setEndpointEnabled(session.user.storeId, id, enabled);
  revalidatePath("/webhooks");
}

export async function deleteWebhookAction(id: string) {
  const session = await requirePermission("webhooks:manage");
  await deleteEndpoint(session.user.storeId, id);
  revalidatePath("/webhooks");
}

export async function resendDeliveryAction(deliveryId: string) {
  const session = await requirePermission("webhooks:manage");
  await resendDelivery(session.user.storeId, deliveryId);
  revalidatePath("/webhooks");
}
