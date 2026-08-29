import Link from "next/link";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, payments } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { formatOrderCode } from "@/lib/orders/number";
import {
  ORDER_STATUS_KEYS,
  ORDER_STATUSES,
  PAYMENT_METHOD_KEYS,
  PAYMENT_STATUS_KEYS,
} from "@/lib/enum-labels";

type OrderStatusValue = (typeof ORDER_STATUSES)[number];
const STATUS_TABS = ["all", ...ORDER_STATUSES] as const;

// The active tab is synced to the URL (?status=placed) from the start —
// SITE_STRUCTURE.md's own audited bug list flags a product that only
// synced pagination this way, dropping the merchant's filtered view on
// every refresh or shared link.
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const activeStatus: "all" | OrderStatusValue = ORDER_STATUSES.includes(rawStatus as OrderStatusValue)
    ? (rawStatus as OrderStatusValue)
    : "all";
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const rows = await withStoreContext(session.user.storeId, (tx) => {
    const conditions = [eq(orders.storeId, session.user.storeId)];
    if (activeStatus !== "all") {
      conditions.push(eq(orders.status, activeStatus));
    }
    return tx
      .select({
        id: orders.id,
        orderCode: orders.orderCode,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        createdAt: orders.createdAt,
        paymentStatus: payments.status,
        itemCount: sql<number>`count(${orderItems.id})`,
      })
      .from(orders)
      .leftJoin(payments, eq(payments.orderId, orders.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(...conditions))
      .groupBy(orders.id, payments.status)
      .orderBy(desc(orders.createdAt));
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("admin.orders.title")}</h1>
        <Link
          href="/orders/create"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t("admin.orders.addOrder")}
        </Link>
      </div>
      <nav className="flex flex-wrap gap-1 border-b text-sm">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={tab === "all" ? "/orders" : `/orders?status=${tab}`}
            className={`px-3 py-2 ${
              activeStatus === tab ? "border-b-2 border-black font-semibold" : "text-gray-500"
            }`}
          >
            {tab === "all" ? t("admin.orders.tabAll") : t(ORDER_STATUS_KEYS[tab])}
          </Link>
        ))}
      </nav>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.orders.colOrderNo")}</th>
            <th className="py-2">{t("admin.orders.colDate")}</th>
            <th className="py-2">{t("admin.orders.colCustomer")}</th>
            <th className="py-2">{t("admin.orders.colItems")}</th>
            <th className="py-2">{t("admin.orders.colTotal")}</th>
            <th className="py-2">{t("admin.orders.colPayment")}</th>
            <th className="py-2">{t("admin.orders.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-gray-500">
                {activeStatus === "all"
                  ? t("admin.orders.noOrders")
                  : t("admin.orders.noOrdersInStatus", { status: t(ORDER_STATUS_KEYS[activeStatus]) })}
              </td>
            </tr>
          ) : (
            rows.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-mono">
                  <Link href={`/orders/${order.id}`} className="block hover:underline">
                    {formatOrderCode(order.orderCode)}
                  </Link>
                </td>
                <td className="py-2">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="py-2">{order.customerName}</td>
                <td className="py-2">{order.itemCount}</td>
                <td className="py-2">৳{order.total}</td>
                <td className="py-2">
                  <span>{t(PAYMENT_METHOD_KEYS[order.paymentMethod])}</span>
                  <span className="ml-1 text-xs text-gray-500">
                    ({order.paymentStatus ? t(PAYMENT_STATUS_KEYS[order.paymentStatus]) : "—"})
                  </span>
                </td>
                <td className="py-2">{t(ORDER_STATUS_KEYS[order.status])}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
