import { requireRole } from "@/lib/auth/roles";
import { getPaymentSettingsView } from "@/lib/payments/settings";
import { getTranslator } from "@/lib/i18n/server";
import { PaymentSettingsForm } from "./PaymentSettingsForm";

export default async function PaymentSettingsPage() {
  const session = await requireRole("admin");
  const view = await getPaymentSettingsView(session.user.storeId);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.payment.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.payment.intro")}</p>
      <PaymentSettingsForm
        sandbox={view.sandbox}
        configuredGateways={view.configuredGateways}
        manualWalletEnabled={view.manualWalletEnabled}
        bkashNumber={view.bkashNumber}
        nagadNumber={view.nagadNumber}
        manualInstructions={view.manualInstructions}
      />
    </div>
  );
}
