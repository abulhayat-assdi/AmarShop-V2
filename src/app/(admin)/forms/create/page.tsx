import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { FormMetaForm } from "../FormMetaForm";
import { createFormAction } from "../actions";

export default async function CreateFormPage() {
  await requirePermission("content:manage");
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.forms.createTitle")}</h1>
      <p className="text-sm text-gray-600">{t("admin.forms.createIntro")}</p>
      <FormMetaForm action={createFormAction} submitLabel={t("admin.forms.createSubmit")} />
    </div>
  );
}
