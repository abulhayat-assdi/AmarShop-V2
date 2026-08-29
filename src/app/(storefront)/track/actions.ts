"use server";

import { headers } from "next/headers";
import { getCurrentStore } from "@/lib/tenant/current";
import { checkRateLimit } from "@/lib/rate-limit";
import { BD_PHONE_PATTERN } from "@/lib/orders/create";
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

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const limit = await checkRateLimit(`track:${store.id}:${ip}`, { limit: 12, windowSeconds: 300 });
  if (!limit.ok) return { error: "track.errRateLimited" };

  const orderNumberRaw = String(formData.get("orderNumber") ?? "")
    .trim()
    .replace(/^#/, "");
  const phone = String(formData.get("phone") ?? "").trim();

  const orderNumber = Number(orderNumberRaw);
  if (!orderNumberRaw || !Number.isInteger(orderNumber) || orderNumber <= 0) {
    return { error: "track.errOrderNumber" };
  }
  if (!BD_PHONE_PATTERN.test(phone)) {
    return { error: "track.errPhone" };
  }

  const order = await findTrackedOrder(store.id, { orderNumber, phone });
  return order ? { order } : { error: "track.errNotFound" };
}
