import { requireStaffSession } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { listOpenLeads } from "@/lib/checkout-leads";
import { LeadRowActions } from "./LeadRowActions";

export default async function AbandonedCheckoutsPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();
  const leads = await listOpenLeads(session.user.storeId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("admin.leads.title")}</h1>
        <p className="text-sm text-gray-600">{t("admin.leads.intro")}</p>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.leads.colCustomer")}</th>
            <th className="py-2">{t("admin.leads.colPhone")}</th>
            <th className="py-2">{t("admin.leads.colAddress")}</th>
            <th className="py-2">{t("admin.leads.colCart")}</th>
            <th className="py-2">{t("admin.leads.colLastSeen")}</th>
            <th className="py-2">{t("admin.leads.colStatus")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-gray-500">
                {t("admin.leads.none")}
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} className="border-b align-top">
                <td className="py-2">{lead.name}</td>
                <td className="py-2">
                  <a href={`tel:${lead.phone}`} className="font-mono underline">
                    {lead.phone}
                  </a>
                </td>
                <td className="py-2 max-w-xs">
                  <span className="whitespace-pre-wrap">{lead.address ?? "—"}</span>
                  {lead.zoneName && (
                    <span className="block text-xs text-gray-500">{lead.zoneName}</span>
                  )}
                </td>
                <td className="py-2" title={lead.cart.items.join(", ")}>
                  {lead.cart.count > 0
                    ? t("admin.leads.cartSummary", {
                        count: lead.cart.count,
                        total: lead.cart.total.toFixed(2),
                      })
                    : "—"}
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {new Date(lead.lastSeenAt).toLocaleString()}
                </td>
                <td className="py-2">
                  {lead.status === "contacted"
                    ? t("admin.leads.statusContacted")
                    : t("admin.leads.statusPending")}
                </td>
                <td className="py-2">
                  <LeadRowActions leadId={lead.id} status={lead.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
