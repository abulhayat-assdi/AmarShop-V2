import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { platformInvoices, stores } from "@/db/schema";
import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { PLANS, isValidPlanId } from "@/lib/billing/plans";
import { BILLING_CYCLE_KEYS, WALLET_PROVIDER_KEYS } from "@/lib/enum-labels";
import { markPaidAction, rejectAction } from "./actions";

// Minimal platform-admin surface: the pending subscription payments a
// merchant has reported, with verify / reject. The full cross-tenant
// platform dashboard is a separate Phase 5 slice.
export default async function PlatformBillingPage() {
  await requirePlatformAdminPage();
  const { t } = await getTranslator();

  const rows = await db
    .select({
      id: platformInvoices.id,
      storeName: stores.name,
      storeSlug: stores.slug,
      plan: platformInvoices.plan,
      cycle: platformInvoices.cycle,
      amount: platformInvoices.amount,
      walletProvider: platformInvoices.walletProvider,
      senderMsisdn: platformInvoices.senderMsisdn,
      senderReference: platformInvoices.senderReference,
      updatedAt: platformInvoices.updatedAt,
    })
    .from(platformInvoices)
    .innerJoin(stores, eq(stores.id, platformInvoices.storeId))
    .where(and(eq(platformInvoices.status, "pending"), isNotNull(platformInvoices.senderReference)))
    .orderBy(asc(platformInvoices.updatedAt));

  const planName = (id: string) => (isValidPlanId(id) ? t(PLANS[id].nameKey) : id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("billing.platform.title")}</h1>
        <p className="text-sm text-gray-600">{t("billing.platform.intro")}</p>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("billing.platform.colStore")}</th>
            <th className="py-2">{t("billing.platform.colPlan")}</th>
            <th className="py-2">{t("billing.platform.colAmount")}</th>
            <th className="py-2">{t("billing.platform.colReport")}</th>
            <th className="py-2">{t("billing.platform.colSubmitted")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-gray-500">
                {t("billing.platform.empty")}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b align-top">
                <td className="py-2">
                  {r.storeName}
                  <span className="block text-xs text-gray-500">{r.storeSlug}</span>
                </td>
                <td className="py-2">
                  {planName(r.plan)}
                  <span className="block text-xs text-gray-500">{t(BILLING_CYCLE_KEYS[r.cycle])}</span>
                </td>
                <td className="py-2">৳{r.amount}</td>
                <td className="py-2 text-xs">
                  <span className="block">
                    {r.walletProvider ? t(WALLET_PROVIDER_KEYS[r.walletProvider]) : "—"} ·{" "}
                    <span className="font-mono">{r.senderMsisdn}</span>
                  </span>
                  <span className="block font-mono">{r.senderReference}</span>
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {new Date(r.updatedAt).toLocaleString()}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <form action={markPaidAction.bind(null, r.id)}>
                      <button
                        type="submit"
                        className="rounded bg-black px-3 py-1 text-xs text-white hover:bg-gray-800"
                      >
                        {t("billing.platform.markPaid")}
                      </button>
                    </form>
                    <form action={rejectAction.bind(null, r.id)}>
                      <button
                        type="submit"
                        className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100"
                      >
                        {t("billing.platform.reject")}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
