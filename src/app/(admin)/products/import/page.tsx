import { requireStaffSession } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { ImportForm } from "./ImportForm";

export default async function ImportProductsPage() {
  await requireStaffSession();
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.import.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.import.intro")}</p>
      <a href="/products/import/template.csv" className="text-sm underline">
        {t("admin.import.templateLink")}
      </a>
      <ImportForm />
    </div>
  );
}
