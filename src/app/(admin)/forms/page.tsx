import Link from "next/link";
import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { listFormsForAdmin } from "@/lib/forms/query";

export default async function FormsPage() {
  const session = await requirePermission("content:manage");
  const { t } = await getTranslator();
  const forms = await listFormsForAdmin(session.user.storeId);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("admin.forms.title")}</h1>
        <Link
          href="/forms/create"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t("admin.forms.newForm")}
        </Link>
      </div>
      <p className="text-sm text-gray-600">{t("admin.forms.intro")}</p>

      {forms.length === 0 ? (
        <p className="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-500">
          {t("admin.forms.empty")}
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">{t("admin.forms.colTitle")}</th>
              <th className="py-2">{t("admin.forms.colStatus")}</th>
              <th className="py-2">{t("admin.forms.colFields")}</th>
              <th className="py-2">{t("admin.forms.colSubmissions")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form.id} className="border-b">
                <td className="py-2">
                  <div className="font-medium">{form.title}</div>
                  <div className="font-mono text-xs text-gray-500">/form/{form.slug}</div>
                </td>
                <td className="py-2">
                  {form.status === "published"
                    ? t("admin.forms.statusPublished")
                    : t("admin.forms.statusDraft")}
                </td>
                <td className="py-2">{form.fieldCount}</td>
                <td className="py-2">
                  {form.submissionCount > 0 ? (
                    <Link href={`/forms/${form.id}/submissions`} className="underline">
                      {form.submissionCount}
                    </Link>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <Link href={`/forms/${form.id}/edit`} className="underline">
                    {t("admin.common.edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
