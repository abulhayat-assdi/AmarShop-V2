"use server";

import { headers } from "next/headers";
import { getCurrentStore } from "@/lib/tenant/current";
import { checkRateLimit } from "@/lib/rate-limit";
import { BD_PHONE_PATTERN } from "@/lib/orders/create";
import { normalizeOrderCode } from "@/lib/orders/number";
import { findTrackedOrder, type TrackedOrderView } from "@/lib/orders/lookup";

// error holds an i18n key (TrackForm translates it) so the page stays
// bilingual; order is the plain view when the lookup succeeds.
export type TrackState = { error?: string; order?: TrackedOrderView };

export async function trackOrderAction(
  _prev: TrackState,
  formData: FormData
): Promise<TrackState> {
  const store = await getCurrentStore();
  if (!store) return { error: "track.errStore" };

  const rawCode = String(formData.get("orderNumber") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();

  // Two limits, because either one alone is bypassable: an attacker who
  // knows a phone number rotates IPs, and one hammering a single IP would
  // otherwise be free to vary the phone. Order codes are unguessable
  // (src/lib/orders/number.ts) — this is defence in depth, not the gate.
  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const limits = await Promise.all([
    checkRateLimit(`track:ip:${store.id}:${ip}`, { limit: 12, windowSeconds: 300 }),
    checkRateLimit(`track:phone:${store.id}:${phone}`, { limit: 12, windowSeconds: 300 }),
  ]);
  if (limits.some((limit) => !limit.ok)) return { error: "track.errRateLimited" };

  const orderCode = normalizeOrderCode(rawCode);
  if (!orderCode) return { error: "track.errOrderNumber" };
  if (!BD_PHONE_PATTERN.test(phone)) return { error: "track.errPhone" };

  const order = await findTrackedOrder(store.id, { orderCode, phone });
  return order ? { order } : { error: "track.errNotFound" };
}
