import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { storefrontUrlFor } from "@/lib/tenant/resolve";
import { getStoreDetail } from "@/lib/platform/detail";
import {
  deleteStoreAction,
  overrideSubscriptionAction,
  setStoreStatusAction,
  setSubscriptionStatusAction,
} from "@/lib/platform/actions";
import { PLAN_IDS, PLANS, isValidPlanId } from "@/lib/billing/plans";
import {
  BILLING_CYCLE_KEYS,
  PLATFORM_INVOICE_STATUS_KEYS,
  STAFF_ROLE_KEYS,
  STORE_STATUS_KEYS,
  STORE_STATUSES,
  SUBSCRIPTION_STATUS_KEYS,
  SUBSCRIPTION_STATUSES,
} from "@/lib/enum-labels";
import { StoreSettingsForm } from "./StoreSettingsForm";

const money = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d: Date | string | null) => (d ? new Date(d).toLocaleString() : "—");

export default async function PlatformStoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdminPage();
  const { id } = await params;
  const { t } = await getTranslator();

  const detail = await getStoreDetail(id);
  if (!detail) notFound();
  const { store, staff, products, categories, activeCoupons, lowStockCount, orders, quota, invoices } =
    detail;
  const url = storefrontUrlFor(store);

  const stat: [string, string | number][] = [
    [t("platform.detail.products"), products.total],
    [
      t("platform.detail.productsBreakdown"),
      `${products.active} / ${products.draft} / ${products.archived}` +
        (products.digital ? ` · ${t("platform.detail.digitalSuffix", { n: products.digital })}` : ""),
    ],
    [t("platform.detail.categories"), categories],
    [t("platform.detail.coupons"), activeCoupons],
    [t("platform.detail.lowStock"), lowStockCount],
    [t("platform.detail.ordersAllTime"), orders.allTime],
    [t("platform.detail.ordersMonth"), orders.thisMonth],
    [t("platform.detail.gmv"), money(orders.gmv)],
    [t("platform.detail.lastOrder"), fmtDate(orders.lastOrderAt)],
    [
      t("platform.detail.quota"),
      `${quota.usedThisMonth} / ${quota.limit ?? t("billing.unlimited")}` +
        (quota.lockedTotal ? ` · ${t("platform.detail.lockedSuffix", { n: quota.lockedTotal })}` : ""),
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/platform" className="text-sm text-gray-500 hover:underline">
          {t("platform.detail.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{store.name}</h1>
          <span
            className={
              store.status === "suspended"
                ? "text-sm text-red-700"
                : store.status === "pending"
                  ? "text-sm text-amber-700"
                  : "text-sm text-green-700"
            }
          >
            {t(STORE_STATUS_KEYS[store.status])}
          </span>
          {url && (
            <a href={url} target="_blank" rel="noopener" className="text-sm underline">
              {t("platform.stores.viewStorefront")} ↗
            </a>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {store.slug} · {t("platform.detail.createdLine", {
            created: fmtDate(store.createdAt),
            updated: fmtDate(store.updatedAt),
          })}
          {store.isDemo ? " · demo" : ""}
          {store.customDomain ? ` · ${store.customDomain}` : ""}
        </p>
      </div>

      {/* Owner & staff */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("platform.detail.ownerStaff")}</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-500">
              <th className="py-1">{t("platform.detail.colName")}</th>
              <th className="py-1">{t("platform.detail.colEmail")}</th>
              <th className="py-1">{t("platform.detail.colPhone")}</th>
              <th className="py-1">{t("platform.detail.colRole")}</th>
              <th className="py-1">{t("platform.detail.colJoined")}</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-2 text-gray-500">
                  {t("platform.detail.noStaff")}
                </td>
              </tr>
            ) : (
              staff.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-1">
                    {m.name}
                    {m.isPlatformAdmin && (
                      <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-600">
                        {t("platform.detail.platformAdminTag")}
                      </span>
                    )}
                  </td>
                  <td className="py-1">{m.email}</td>
                  <td className="py-1">{m.phone ?? "—"}</td>
                  <td className="py-1">{t(STAFF_ROLE_KEYS[m.role])}</td>
                  <td className="py-1 text-xs text-gray-500">{fmtDate(m.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Commerce */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("platform.detail.commerce")}</h2>
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3 lg:grid-cols-5">
          {stat.map(([label, value]) => (
            <div key={label} className="rounded border p-2">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subscription */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("platform.detail.subscription")}</h2>
        <p className="text-sm">
          {isValidPlanId(store.subscriptionPlan)
            ? t(PLANS[store.subscriptionPlan].nameKey)
            : store.subscriptionPlan}{" "}
          · {t(SUBSCRIPTION_STATUS_KEYS[store.subscriptionStatus])}
          {store.subscriptionCycle ? ` · ${t(BILLING_CYCLE_KEYS[store.subscriptionCycle])}` : ""}
          {store.subscriptionStatus === "trialing" && store.trialEndsAt
            ? ` · ${t("platform.detail.trialEnds", { date: fmtDate(store.trialEndsAt) })}`
            : store.currentPeriodEndsAt
              ? ` · ${t("billing.renewsOn", { date: fmtDate(store.currentPeriodEndsAt) })}`
              : ""}
        </p>

        <div className="flex flex-wrap gap-4">
          <form
            action={overrideSubscriptionAction.bind(null, store.id)}
            className="flex flex-wrap items-end gap-2 rounded border p-3 text-sm"
          >
            <span className="w-full text-xs font-medium text-gray-600">
              {t("platform.action.overrideTitle")}
            </span>
            <select
              name="plan"
              defaultValue={store.subscriptionPlan}
              className="rounded border border-gray-300 px-2 py-1"
            >
              {PLAN_IDS.map((pid) => (
                <option key={pid} value={pid}>
                  {t(PLANS[pid].nameKey)}
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
            <button type="submit" className="rounded bg-black px-3 py-1 text-white">
              {t("platform.action.overrideApply")}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm">
            <span className="w-full text-xs font-medium text-gray-600">
              {t("platform.action.setSubStatus")}
            </span>
            {SUBSCRIPTION_STATUSES.filter((s) => s !== store.subscriptionStatus).map((s) => (
              <form key={s} action={setSubscriptionStatusAction.bind(null, store.id, s)}>
                <button
                  type="submit"
                  className="rounded border border-gray-400 px-3 py-1 hover:bg-gray-100"
                >
                  {t(SUBSCRIPTION_STATUS_KEYS[s])}
                </button>
              </form>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-medium">{t("platform.detail.invoiceHistory")}</h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">{t("platform.detail.noInvoices")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="py-1">{t("billing.colDate")}</th>
                  <th className="py-1">{t("billing.colPlan")}</th>
                  <th className="py-1">{t("billing.colCycle")}</th>
                  <th className="py-1">{t("billing.colAmount")}</th>
                  <th className="py-1">{t("billing.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b">
                    <td className="py-1">{fmtDate(inv.createdAt)}</td>
                    <td className="py-1">
                      {isValidPlanId(inv.plan) ? t(PLANS[inv.plan].nameKey) : inv.plan}
                    </td>
                    <td className="py-1">{t(BILLING_CYCLE_KEYS[inv.cycle])}</td>
                    <td className="py-1">৳{inv.amount}</td>
                    <td className="py-1">{t(PLATFORM_INVOICE_STATUS_KEYS[inv.status])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Store settings */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("platform.detail.settings")}</h2>
        <StoreSettingsForm
          storeId={store.id}
          initial={{
            name: store.name,
            slug: store.slug,
            locale: store.locale,
            lowStockThreshold: store.lowStockThreshold,
            digitalEnabled: store.digitalEnabled,
            metaPixelId: store.metaPixelId ?? "",
            ga4MeasurementId: store.ga4MeasurementId ?? "",
          }}
        />
      </section>

      {/* Danger zone */}
      <section className="flex flex-col gap-3 rounded border border-red-300 p-4">
        <h2 className="text-lg font-semibold text-red-700">{t("platform.detail.dangerZone")}</h2>
        <div className="flex flex-wrap gap-2">
          {STORE_STATUSES.filter((s) => s !== store.status).map((s) => (
            <form key={s} action={setStoreStatusAction.bind(null, store.id, s)}>
              <button
                type="submit"
                className="rounded border border-gray-400 px-3 py-1 text-sm hover:bg-gray-100"
              >
                {t(STORE_STATUS_KEYS[s])}
              </button>
            </form>
          ))}
        </div>
        <form action={deleteStoreAction.bind(null, store.id)} className="flex flex-col gap-2">
          <p className="text-sm text-red-700">{t("platform.detail.deleteWarning")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="confirmSlug"
              placeholder={store.slug}
              autoComplete="off"
              className="rounded border border-red-300 px-3 py-1 text-sm"
              aria-label={t("platform.detail.deleteConfirmLabel", { slug: store.slug })}
            />
            <button
              type="submit"
              className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
            >
              {t("platform.detail.deleteButton")}
            </button>
          </div>
        </form>
      </section>

      <p className="text-xs text-gray-400">{t("platform.detail.updatedAt", { at: fmtDateTime(store.updatedAt) })}</p>
    </div>
  );
}
