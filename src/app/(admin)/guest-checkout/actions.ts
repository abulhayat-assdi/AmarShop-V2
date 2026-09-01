"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getSmsSettingsView } from "@/lib/sms/settings";

export type GuestCheckoutState = { error?: string; ok?: boolean };

// stores is outside the RLS boundary — write via `db` directly, scoped by
// the session's own storeId, like marketing-settings/actions.ts.
export async function saveGuestCheckoutSettingsAction(
  _prev: GuestCheckoutState,
  formData: FormData
): Promise<GuestCheckoutState> {
  const session = await requirePermission("guest_checkout:manage");

  // Never trust the client's disabled-checkbox omission alone — re-check
  // server-side that a real gateway is actually connected before this can
  // be turned on (SITE_STRUCTURE.md: "gray out ... until an SMS gateway is
  // actually connected").
  const sms = await getSmsSettingsView(session.user.storeId);
  const smsConnected = sms.provider === "bulksmsbd" && sms.configuredProviders.includes("bulksmsbd");
  const requestedOtp = formData.get("checkoutOtpRequired") != null;

  if (requestedOtp && !smsConnected) {
    return { error: "admin.guestCheckout.needsGateway" };
  }

  await db
    .update(stores)
    .set({ checkoutOtpRequired: smsConnected && requestedOtp, updatedAt: new Date() })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/guest-checkout");
  return { ok: true };
}
