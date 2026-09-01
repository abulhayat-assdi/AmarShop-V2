import { requirePermission } from "@/lib/auth/roles";
import { listCheckoutFields } from "@/lib/checkout-fields/query";
import { getTranslator } from "@/lib/i18n/server";
import { AddCheckoutFieldForm } from "./AddCheckoutFieldForm";
import { CheckoutFieldRow } from "./CheckoutFieldRow";

export default async function CheckoutSettingsPage() {
  const session = await requirePermission("settings:manage");
  const fields = await listCheckoutFields(session.user.storeId);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.checkoutSettings.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.checkoutSettings.intro")}</p>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.checkoutSettings.addTitle")}</h2>
        <AddCheckoutFieldForm />
      </section>

      {fields.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">{t("admin.checkoutSettings.fieldsTitle")}</h2>
          {fields.map((f) => (
            <CheckoutFieldRow key={f.id} field={f} />
          ))}
        </section>
      )}
    </div>
  );
}
