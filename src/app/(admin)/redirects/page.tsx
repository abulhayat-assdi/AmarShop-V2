import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { listRedirects } from "@/lib/redirects/manage";
import { AddRedirectForm } from "./AddRedirectForm";
import { RedirectRow } from "./RedirectRow";

export default async function RedirectsPage() {
  const session = await requirePermission("settings:manage");
  const rows = await listRedirects(session.user.storeId);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("admin.redirects.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("admin.redirects.intro")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.redirects.addTitle")}</h2>
        <AddRedirectForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{t("admin.redirects.listTitle")}</h2>
        {rows.length === 0 ? (
          <p className="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-500">
            {t("admin.redirects.empty")}
          </p>
        ) : (
          rows.map((r) => <RedirectRow key={r.id} redirect={r} />)
        )}
      </section>
    </div>
  );
}
