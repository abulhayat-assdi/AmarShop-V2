import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { smsMessages } from "@/db/schema";
import { getSmsSettingsView } from "@/lib/sms/settings";
import { getTranslator } from "@/lib/i18n/server";
import { SmsSettingsForm } from "./SmsSettingsForm";

const STATUS_KEYS: Record<string, string> = {
  pending: "admin.sms.statusPending",
  sent: "admin.sms.statusSent",
  failed: "admin.sms.statusFailed",
};

export default async function SmsSettingsPage() {
  const session = await requireRole("admin");
  const view = await getSmsSettingsView(session.user.storeId);
  const recent = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({
        id: smsMessages.id,
        createdAt: smsMessages.createdAt,
        event: smsMessages.event,
        toPhone: smsMessages.toPhone,
        status: smsMessages.status,
      })
      .from(smsMessages)
      .where(eq(smsMessages.storeId, session.user.storeId))
      .orderBy(desc(smsMessages.createdAt))
      .limit(10)
  );
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.sms.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.sms.intro")}</p>

      <SmsSettingsForm
        provider={view.provider}
        senderId={view.senderId}
        sandbox={view.sandbox}
        notifyOrderPlaced={view.notifyOrderPlaced}
        notifyOrderShipped={view.notifyOrderShipped}
        configuredProviders={view.configuredProviders}
      />

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("admin.sms.recentTitle")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">{t("admin.sms.recentEmpty")}</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-1">{t("admin.sms.colTime")}</th>
                <th className="py-1">{t("admin.sms.colEvent")}</th>
                <th className="py-1">{t("admin.sms.colPhone")}</th>
                <th className="py-1">{t("admin.sms.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-1">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="py-1">{m.event}</td>
                  <td className="py-1 font-mono">{m.toPhone}</td>
                  <td
                    className={`py-1 ${m.status === "failed" ? "text-red-600" : m.status === "sent" ? "text-green-700" : "text-gray-500"}`}
                  >
                    {t(STATUS_KEYS[m.status] ?? m.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
