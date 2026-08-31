import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { orders } from "@/db/schema";
import { getOrderQuota } from "@/lib/billing/order-quota";
import { formatOrderCode } from "@/lib/orders/number";
import { getTranslator } from "@/lib/i18n/server";

// Redacted view of orders that arrived over the store's monthly quota.
// Deliberately shows ONLY the count + order code + date — no customer
// name/phone/address, no items, no amount, no status — until the merchant
// upgrades (which unlocks the whole backlog).
export default async function LockedOrdersPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const quota = await getOrderQuota(session.user.storeId);
  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({ orderCode: orders.orderCode, createdAt: orders.createdAt })
      .from(orders)
      .where(and(eq(orders.storeId, session.user.storeId), isNotNull(orders.quotaLockedAt)))
      .orderBy(desc(orders.createdAt))
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("admin.ordersLocked.title")}</h1>
        <p className="text-sm text-gray-600">{t("admin.ordersLocked.intro")}</p>
      </div>

      <div className="flex flex-col gap-3 rounded border border-amber-300 bg-amber-50 p-4">
        <p className="text-lg font-semibold text-amber-900">
          {t("admin.ordersLocked.count", { count: quota.lockedTotal })}
        </p>
        <p className="text-sm text-amber-800">{t("admin.ordersLocked.whyLocked")}</p>
        <Link
          href="/billing"
          className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t("admin.ordersLocked.upgradeCta")}
        </Link>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.ordersLocked.colCode")}</th>
            <th className="py-2">{t("admin.ordersLocked.colDate")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-4 text-gray-500">
                {t("admin.ordersLocked.empty")}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.orderCode} className="border-b">
                <td className="py-2 font-mono">{formatOrderCode(r.orderCode)}</td>
                <td className="py-2">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
