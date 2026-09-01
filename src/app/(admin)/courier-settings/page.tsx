import { requirePermission } from "@/lib/auth/roles";
import { getCourierSettingsView } from "@/lib/courier/settings";
import { getTranslator } from "@/lib/i18n/server";
import { CourierSettingsForm } from "./CourierSettingsForm";

export default async function CourierSettingsPage() {
  const session = await requirePermission("courier:manage");
  const view = await getCourierSettingsView(session.user.storeId);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.courier.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.courier.intro")}</p>
      <CourierSettingsForm
        activeProvider={view.activeProvider}
        sandbox={view.sandbox}
        configuredProviders={view.configuredProviders}
      />
    </div>
  );
}
