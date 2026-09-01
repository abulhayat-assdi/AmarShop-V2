import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { SCOPE_LABEL_KEYS } from "@/lib/api/scopes";
import { listInstallations } from "@/lib/oauth/install";
import { uninstallAppAction } from "./actions";

function fmtDate(d: Date | string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default async function InstalledAppsPage() {
  const session = await requirePermission("installed_apps:manage");
  const { t } = await getTranslator();
  const apps = await listInstallations(session.user.storeId);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("admin.installedApps.title")}</h1>
        <p className="text-sm text-gray-600">{t("admin.installedApps.intro")}</p>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.installedApps.colApp")}</th>
            <th className="py-2">{t("admin.installedApps.colDeveloper")}</th>
            <th className="py-2">{t("admin.installedApps.colScopes")}</th>
            <th className="py-2">{t("admin.installedApps.colToken")}</th>
            <th className="py-2">{t("admin.installedApps.colLastUsed")}</th>
            <th className="py-2">{t("admin.installedApps.colInstalled")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {apps.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-gray-500">
                {t("admin.installedApps.none")}
              </td>
            </tr>
          ) : (
            apps.map((a) => (
              <tr key={a.id} className="border-b align-top">
                <td className="py-2">
                  <span className="flex items-start gap-2">
                    {a.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.logoUrl}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded border border-gray-200 object-cover"
                      />
                    )}
                    <span>
                      {a.homepageUrl ? (
                        <a
                          href={a.homepageUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline"
                        >
                          {a.appName}
                        </a>
                      ) : (
                        a.appName
                      )}
                      {a.appStatus === "disabled" && (
                        <span className="mt-1 block text-xs text-red-600">
                          {t("admin.installedApps.disabledBadge")}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="py-2 text-xs text-gray-600">{a.developerName}</td>
                <td className="py-2">
                  <span className="flex flex-wrap gap-1">
                    {a.scopes.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-gray-100 px-1 text-xs"
                        title={t(SCOPE_LABEL_KEYS[s])}
                      >
                        <span className="font-mono">{s}</span>
                      </span>
                    ))}
                  </span>
                </td>
                <td className="py-2 font-mono text-xs">{a.tokenPrefix}…</td>
                <td className="py-2 text-xs text-gray-500">{fmtDate(a.lastUsedAt)}</td>
                <td className="py-2 text-xs text-gray-500">{fmtDate(a.createdAt)}</td>
                <td className="py-2">
                  <form action={uninstallAppAction.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="rounded border border-red-400 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      {t("admin.installedApps.uninstall")}
                    </button>
                  </form>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
