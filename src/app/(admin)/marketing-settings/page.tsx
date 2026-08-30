import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { MarketingSettingsForm } from "./MarketingSettingsForm";

export default async function MarketingSettingsPage() {
  const session = await requireRole("admin");
  const [store] = await db
    .select({ metaPixelId: stores.metaPixelId, ga4MeasurementId: stores.ga4MeasurementId })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.marketing.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.marketing.intro")}</p>
      <MarketingSettingsForm
        metaPixelId={store?.metaPixelId ?? null}
        ga4MeasurementId={store?.ga4MeasurementId ?? null}
      />
    </div>
  );
}
