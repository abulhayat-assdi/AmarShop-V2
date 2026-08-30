"use server";

import { headers } from "next/headers";
import { getCurrentStore } from "@/lib/tenant/current";
import { getCartToken } from "@/lib/cart";
import { BD_PHONE_PATTERN } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveCheckoutLead } from "@/lib/checkout-leads";

// Fire-and-forget from the checkout form as the customer types (debounced).
// Records an incomplete-checkout lead once a name + a valid phone are
// present, so the merchant can call to confirm the order. Never throws —
// the customer sees nothing either way.
export async function saveCheckoutLeadAction(formData: FormData): Promise<void> {
  try {
    const store = await getCurrentStore();
    if (!store) return;

    const token = await getCartToken();
    if (!token) return;

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!name || !BD_PHONE_PATTERN.test(phone)) return;

    const address = String(formData.get("address") ?? "").trim() || null;
    const deliveryZoneId = String(formData.get("deliveryZoneId") ?? "").trim() || null;

    const headerList = await headers();
    const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const limit = await checkRateLimit(`lead:ip:${store.id}:${ip}`, {
      limit: 20,
      windowSeconds: 60,
    });
    if (!limit.ok) return;

    await saveCheckoutLead({
      storeId: store.id,
      cartToken: token,
      name,
      phone,
      address,
      deliveryZoneId,
    });
  } catch (err) {
    console.error("[checkout-lead] save action failed", err);
  }
}
