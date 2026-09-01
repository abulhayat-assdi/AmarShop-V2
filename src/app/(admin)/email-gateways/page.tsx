import { desc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { emailMessages } from "@/db/schema";
import { getEmailSettingsView } from "@/lib/email/settings";
import { getTranslator } from "@/lib/i18n/server";
import { EmailSettingsForm } from "./EmailSettingsForm";
import { SendTestEmailForm } from "./SendTestEmailForm";

const STATUS_KEYS: Record<string, string> = {
  pending: "admin.emailGateways.statusPending",
  sent: "admin.emailGateways.statusSent",
  failed: "admin.emailGateways.statusFailed",
};

export default async function EmailGatewaysPage() {
  const session = await requirePermission("email_settings:manage");
  const view = await getEmailSettingsView(session.user.storeId);
  const recent = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({
        id: emailMessages.id,
        createdAt: emailMessages.createdAt,
        toEmail: emailMessages.toEmail,
        subject: emailMessages.subject,
        status: emailMessages.status,
      })
      .from(emailMessages)
      .where(eq(emailMessages.storeId, session.user.storeId))
      .orderBy(desc(emailMessages.createdAt))
      .limit(10)
  );
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.emailGateways.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.emailGateways.intro")}</p>

      <EmailSettingsForm
        provider={view.provider}
        fromName={view.fromName}
        fromEmail={view.fromEmail}
        host={view.host}
        port={view.port}
        secure={view.secure}
        configuredProviders={view.configuredProviders}
      />

      {view.provider && <SendTestEmailForm />}

      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("admin.emailGateways.recentTitle")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">{t("admin.emailGateways.recentEmpty")}</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-1">{t("admin.emailGateways.colTime")}</th>
                <th className="py-1">{t("admin.emailGateways.colTo")}</th>
                <th className="py-1">{t("admin.emailGateways.colSubject")}</th>
                <th className="py-1">{t("admin.emailGateways.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-1">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="py-1 font-mono">{m.toEmail}</td>
                  <td className="py-1">{m.subject}</td>
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
