import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getSmsSettingsView } from "@/lib/sms/settings";
import { getTranslator } from "@/lib/i18n/server";
import { GuestCheckoutForm } from "./GuestCheckoutForm";

export default async function GuestCheckoutPage() {
  const session = await requirePermission("guest_checkout:manage");
  const [store] = await db
    .select({ checkoutOtpRequired: stores.checkoutOtpRequired })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const sms = await getSmsSettingsView(session.user.storeId);
  const smsConnected = sms.provider === "bulksmsbd" && sms.configuredProviders.includes("bulksmsbd");
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.guestCheckout.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.guestCheckout.intro")}</p>
      <GuestCheckoutForm
        checkoutOtpRequired={store?.checkoutOtpRequired ?? false}
        smsConnected={smsConnected}
      />
    </div>
  );
}
