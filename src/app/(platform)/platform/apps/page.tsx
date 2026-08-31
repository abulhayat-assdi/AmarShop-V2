import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { listOAuthApps } from "@/lib/oauth/apps";
import { AppsManager } from "./AppsManager";

export default async function PlatformAppsPage() {
  await requirePlatformAdminPage();
  const { t } = await getTranslator();
  const apps = await listOAuthApps();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("platform.apps.title")}</h1>
        <p className="text-sm text-gray-600">{t("platform.apps.intro")}</p>
      </div>
      <AppsManager apps={apps} />
    </div>
  );
}
