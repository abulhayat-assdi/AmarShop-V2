import { requireRole } from "@/lib/auth/roles";
import { getCourierSettingsView } from "@/lib/courier/settings";
import { CourierSettingsForm } from "./CourierSettingsForm";

export default async function CourierSettingsPage() {
  const session = await requireRole("admin");
  const view = await getCourierSettingsView(session.user.storeId);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Courier Settings</h1>
      <p className="text-sm text-gray-600">
        Choose your delivery partner and add its API credentials. &ldquo;Book courier&rdquo; on an
        order uses the active courier. Credentials are stored encrypted and never shown back.
      </p>
      <CourierSettingsForm
        activeProvider={view.activeProvider}
        sandbox={view.sandbox}
        configuredProviders={view.configuredProviders}
      />
    </div>
  );
}
