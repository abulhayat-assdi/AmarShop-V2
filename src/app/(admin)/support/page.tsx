import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { SupportSettingsForm } from "./SupportSettingsForm";

export default async function SupportSettingsPage() {
  const session = await requirePermission("support:manage");
  const [store] = await db
    .select({
      supportEmail: stores.supportEmail,
      supportPhone: stores.supportPhone,
      supportHours: stores.supportHours,
    })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.support.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.support.intro")}</p>
      <SupportSettingsForm
        supportEmail={store?.supportEmail ?? null}
        supportPhone={store?.supportPhone ?? null}
        supportHours={store?.supportHours ?? null}
      />
    </div>
  );
}
