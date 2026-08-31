import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { storefrontUrlFor } from "@/lib/tenant/resolve";
import { getPlatformOverview, listStores } from "@/lib/platform/overview";
import { setStoreStatusAction, overrideSubscriptionAction } from "@/lib/platform/actions";
import { PLAN_IDS, PLANS, isValidPlanId } from "@/lib/billing/plans";
import {
  STORE_STATUS_KEYS,
  STORE_STATUSES,
  SUBSCRIPTION_STATUS_KEYS,
  SUBSCRIPTION_STATUSES,
} from "@/lib/enum-labels";

const money = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default async function PlatformDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    plan?: string;
    subStatus?: string;
    page?: string;
  }>;
}) {
  await requirePlatformAdminPage();
  const { q, status, plan, subStatus, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const { t } = await getTranslator();

  const overview = await getPlatformOverview();
  const { rows, total, pageSize } = await listStores({ page, q, status, plan, subStatus });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const params = (over: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (plan) sp.set("plan", plan);
    if (subStatus) sp.set("subStatus", subStatus);
    if (page > 1) sp.set("page", String(page));
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined || v === "" || (k === "page" && v === 1)) sp.delete(k);
      else sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `/platform?${s}` : "/platform";
  };

  const cards: [string, string][] = [
    [t("platform.metric.stores"), String(overview.totalStores)],
    [t("platform.metric.active"), String(overview.paidSubscriptions)],
    [t("platform.metric.trialing"), String(overview.trialing)],
    [t("platform.metric.suspended"), String(overview.suspendedStores)],
    [t("platform.metric.mrr"), money(overview.mrr)],
    [t("platform.metric.gmv"), money(overview.totalGmv)],
    [t("platform.metric.orders"), String(overview.totalOrders)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("platform.dashboard.title")}</h1>
        <p className="text-sm text-gray-600">{t("platform.dashboard.intro")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded border p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <form action="/platform" className="flex flex-wrap items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("platform.stores.search")}
            className="rounded border border-gray-300 px-3 py-1.5"
          />
          <select
            name="plan"
            defaultValue={plan ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5"
          >
            <option value="">{t("platform.filter.anyPlan")}</option>
            {PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {t(PLANS[id].nameKey)}
              </option>
            ))}
          </select>
          <select
            name="subStatus"
            defaultValue={subStatus ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5"
          >
            <option value="">{t("platform.filter.anySubStatus")}</option>
            {SUBSCRIPTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(SUBSCRIPTION_STATUS_KEYS[s])}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-black px-3 py-1.5 text-white">
            {t("platform.stores.search")}
          </button>
        </form>
        <div className="flex gap-1">
          <Link
            href={params({ status: undefined, page: undefined })}
            className={`rounded px-2 py-1 ${!status ? "bg-black text-white" : "hover:bg-gray-100"}`}
          >
            {t("platform.stores.filterAll")}
          </Link>
          {STORE_STATUSES.map((s) => (
            <Link
              key={s}
              href={params({ status: s, page: undefined })}
              className={`rounded px-2 py-1 ${status === s ? "bg-black text-white" : "hover:bg-gray-100"}`}
            >
              {t(STORE_STATUS_KEYS[s])}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">{t("platform.stores.colStore")}</th>
              <th className="py-2">{t("platform.stores.colStatus")}</th>
              <th className="py-2">{t("platform.stores.colPlan")}</th>
              <th className="py-2">{t("platform.stores.colCreated")}</th>
              <th className="py-2">{t("platform.stores.colOrders")}</th>
              <th className="py-2">{t("platform.stores.colMonthly")}</th>
              <th className="py-2">{t("platform.stores.colGmv")}</th>
              <th className="py-2">{t("platform.stores.colLastOrder")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-4 text-gray-500">
                  {t("platform.stores.empty")}
                </td>
              </tr>
            ) : (
              rows.map((s) => {
                const url = storefrontUrlFor(s);
                return (
                  <tr key={s.id} className="border-b align-top">
                    <td className="py-2">
                      <Link
                        href={`/platform/stores/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener"
                          className="ml-1 text-xs text-gray-400 hover:text-gray-700"
                          title={t("platform.stores.viewStorefront")}
                        >
                          ↗
                        </a>
                      )}
                      <span className="block text-xs text-gray-500">
                        {s.slug}
                        {s.isDemo ? " · demo" : ""}
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          s.status === "suspended"
                            ? "text-red-700"
                            : s.status === "pending"
                              ? "text-amber-700"
                              : "text-green-700"
                        }
                      >
                        {t(STORE_STATUS_KEYS[s.status])}
                      </span>
                    </td>
                    <td className="py-2">
                      {isValidPlanId(s.subscriptionPlan)
                        ? t(PLANS[s.subscriptionPlan].nameKey)
                        : s.subscriptionPlan}
                      <span className="block text-xs text-gray-500">
                        {t(SUBSCRIPTION_STATUS_KEYS[s.subscriptionStatus])}
                        {s.subscriptionStatus === "trialing"
                          ? ` · ${fmtDate(s.trialEndsAt)}`
                          : s.currentPeriodEndsAt
                            ? ` · ${fmtDate(s.currentPeriodEndsAt)}`
                            : ""}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-gray-500">{fmtDate(s.createdAt)}</td>
                    <td className="py-2">{s.orderCount}</td>
                    <td className="py-2">{s.ordersThisMonth}</td>
                    <td className="py-2">{money(s.gmv)}</td>
                    <td className="py-2 text-xs text-gray-500">{fmtDate(s.lastOrderAt)}</td>
                    <td className="py-2">
                      <div className="flex flex-col gap-2">
                        <form
                          action={setStoreStatusAction.bind(
                            null,
                            s.id,
                            s.status === "active" ? "suspended" : "active"
                          )}
                        >
                          <button
                            type="submit"
                            className={`rounded px-2 py-1 text-xs ${
                              s.status === "active"
                                ? "border border-red-400 text-red-600 hover:bg-red-50"
                                : "bg-black text-white hover:bg-gray-800"
                            }`}
                          >
                            {s.status === "active"
                              ? t("platform.action.suspend")
                              : t("platform.action.activate")}
                          </button>
                        </form>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-600">
                            {t("platform.action.overrideTitle")}
                          </summary>
                          <form
                            action={overrideSubscriptionAction.bind(null, s.id)}
                            className="mt-2 flex flex-wrap items-center gap-2"
                          >
                            <select
                              name="plan"
                              defaultValue={s.subscriptionPlan}
                              className="rounded border border-gray-300 px-2 py-1"
                            >
                              {PLAN_IDS.map((id) => (
                                <option key={id} value={id}>
                                  {t(PLANS[id].nameKey)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              name="months"
                              min={1}
                              max={36}
                              defaultValue={1}
                              className="w-16 rounded border border-gray-300 px-2 py-1"
                              aria-label={t("platform.action.overrideMonths")}
                            />
                            <button
                              type="submit"
                              className="rounded bg-black px-2 py-1 text-white hover:bg-gray-800"
                            >
                              {t("platform.action.overrideApply")}
                            </button>
                          </form>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={params({ page: page - 1 })} className="underline">
              {t("platform.stores.prev")}
            </Link>
          )}
          <span className="text-gray-500">
            {page} / {pageCount}
          </span>
          {page < pageCount && (
            <Link href={params({ page: page + 1 })} className="underline">
              {t("platform.stores.next")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
