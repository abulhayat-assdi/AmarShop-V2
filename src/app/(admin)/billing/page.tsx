import { requireRole } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import {
  getPendingInvoice,
  getSubscription,
  getUsage,
  listPlatformInvoices,
} from "@/lib/billing/subscription";
import { getOrderQuota } from "@/lib/billing/order-quota";
import { renewalState } from "@/lib/billing/lifecycle";
import { getPlatformBillingConfig } from "@/lib/billing/platform-config";
import { PLANS, RENEWAL_REMINDER_DAYS, isValidPlanId, planLimit } from "@/lib/billing/plans";
import {
  BILLING_CYCLE_KEYS,
  PLATFORM_INVOICE_STATUS_KEYS,
  SUBSCRIPTION_STATUS_KEYS,
} from "@/lib/enum-labels";
import { BillingView } from "./BillingView";

function fmtDate(d: Date | string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default async function BillingPage() {
  const session = await requireRole("admin");
  const storeId = session.user.storeId;
  const { t } = await getTranslator();

  const sub = await getSubscription(storeId);
  const usage = await getUsage(storeId);
  const orderQuota = await getOrderQuota(storeId);
  const invoices = await listPlatformInvoices(storeId);
  const pending = await getPendingInvoice(storeId);
  const platform = getPlatformBillingConfig();

  const effName = t(PLANS[sub.effectivePlanId].nameKey);
  const planName = (id: string) => (isValidPlanId(id) ? t(PLANS[id].nameKey) : id);
  const meter = (key: string, used: number, limit: number | null) =>
    t(key, { used, limit: limit === null ? t("billing.unlimited") : limit });
  const overClass = (used: number, limit: number | null) =>
    limit !== null && used >= limit ? "text-red-700" : undefined;

  const renewal = renewalState({
    status: sub.status,
    currentPeriodEndsAt: sub.currentPeriodEndsAt,
  });

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("billing.title")}</h1>
        <p className="text-sm text-gray-600">{t("billing.intro")}</p>
      </div>

      {renewal.isPastDue && (
        <p className="rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {t("billing.pastDueBanner", { date: fmtDate(sub.currentPeriodEndsAt) })}
        </p>
      )}
      {!renewal.isPastDue &&
        renewal.renewsInDays !== null &&
        renewal.renewsInDays <= RENEWAL_REMINDER_DAYS && (
          <p className="rounded border border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-900">
            {t("billing.renewalSoon", { date: fmtDate(sub.currentPeriodEndsAt) })}
          </p>
        )}

      <section className="flex flex-col gap-2 rounded border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">{effName}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
            {t(SUBSCRIPTION_STATUS_KEYS[sub.status])}
          </span>
        </div>

        {sub.inTrial && (
          <p className="text-sm text-gray-600">
            {t("billing.trialIncludes", { plan: effName })}{" "}
            {t("billing.trialEndsIn", { days: sub.trialDaysLeft, date: fmtDate(sub.trialEndsAt) })}
          </p>
        )}
        {!sub.inTrial && sub.status === "trialing" && (
          <p className="text-sm text-amber-700">{t("billing.trialExpired")}</p>
        )}
        {sub.status === "active" && sub.currentPeriodEndsAt && (
          <p className="text-sm text-gray-600">
            {t("billing.renewsOn", { date: fmtDate(sub.currentPeriodEndsAt) })}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-1 text-sm">
          <span className={overClass(usage.products, planLimit(sub.effectivePlanId, "products"))}>
            {meter("billing.productsMeter", usage.products, planLimit(sub.effectivePlanId, "products"))}
          </span>
          <span className={overClass(usage.staff, planLimit(sub.effectivePlanId, "staff"))}>
            {meter("billing.staffMeter", usage.staff, planLimit(sub.effectivePlanId, "staff"))}
          </span>
          <span className={overClass(orderQuota.usedThisMonth, orderQuota.limit)}>
            {meter("billing.ordersMeter", orderQuota.usedThisMonth, orderQuota.limit)}
          </span>
          {orderQuota.lockedTotal > 0 && (
            <span className="text-red-700">
              {t("billing.ordersLocked", { count: orderQuota.lockedTotal })}
            </span>
          )}
        </div>
      </section>

      <BillingView
        committedPlan={sub.plan}
        pending={
          pending
            ? {
                id: pending.id,
                amount: pending.amount,
                periodStart: fmtDate(pending.periodStart),
                periodEnd: fmtDate(pending.periodEnd),
                hasReport: pending.senderReference != null,
              }
            : null
        }
        platform={platform}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("billing.historyTitle")}</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">{t("billing.colDate")}</th>
              <th className="py-2">{t("billing.colPlan")}</th>
              <th className="py-2">{t("billing.colCycle")}</th>
              <th className="py-2">{t("billing.colAmount")}</th>
              <th className="py-2">{t("billing.colStatus")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-gray-500">
                  {t("billing.noInvoices")}
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b">
                  <td className="py-2">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className="py-2">{planName(inv.plan)}</td>
                  <td className="py-2">{t(BILLING_CYCLE_KEYS[inv.cycle])}</td>
                  <td className="py-2">৳{inv.amount}</td>
                  <td className="py-2">{t(PLATFORM_INVOICE_STATUS_KEYS[inv.status])}</td>
                  <td className="py-2">
                    {inv.status === "paid" && (
                      <a
                        href={`/billing/invoices/${inv.id}/receipt`}
                        className="text-xs underline"
                      >
                        {t("billing.downloadReceipt")}
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
