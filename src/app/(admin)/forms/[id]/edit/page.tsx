import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { getFormForAdmin } from "@/lib/forms/query";
import { FormMetaForm } from "../../FormMetaForm";
import { DeleteFormButton } from "../../DeleteFormButton";
import { AddFieldForm } from "./AddFieldForm";
import { FieldRow } from "./FieldRow";
import { updateFormAction } from "../../actions";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("content:manage");
  const { t } = await getTranslator();

  const data = await getFormForAdmin(session.user.storeId, id);
  if (!data) notFound();
  const { form, fields } = data;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("admin.forms.editTitle")}</h1>
        <div className="flex items-center gap-4 text-sm">
          {form.status === "published" && (
            <a href={`/form/${form.slug}`} target="_blank" rel="noreferrer" className="underline">
              {t("admin.forms.viewOnSite")}
            </a>
          )}
          {fields.length > 0 && (
            <Link href={`/forms/${form.id}/submissions`} className="underline">
              {t("admin.forms.submissions")}
            </Link>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.forms.metaTitle")}</h2>
        <FormMetaForm
          action={updateFormAction.bind(null, form.id)}
          submitLabel={t("admin.common.save")}
          initialValues={{
            title: form.title,
            slug: form.slug,
            description: form.description ?? "",
            successMessage: form.successMessage ?? "",
            status: form.status,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.forms.fieldsTitle")}</h2>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">{t("admin.forms.noFields")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((f) => (
              <FieldRow key={f.id} formId={form.id} field={f} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.forms.addFieldTitle")}</h2>
        <AddFieldForm formId={form.id} />
      </section>

      <section className="flex flex-col gap-2 border-t pt-4">
        <h2 className="font-medium">{t("admin.forms.dangerTitle")}</h2>
        <DeleteFormButton formId={form.id} />
      </section>
    </div>
  );
}
