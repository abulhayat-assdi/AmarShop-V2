import Link from "next/link";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, payments } from "@/db/schema";

const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "ready",
  "shipped",
  "delivered",
  "completed",
  "canceled",
] as const;
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

  const rows = await withStoreContext(session.user.storeId, (tx) => {
    const conditions = [eq(orders.storeId, session.user.storeId)];
    if (activeStatus !== "all") {
      conditions.push(eq(orders.status, activeStatus));
    }
    return tx
      .select({
        id: orders.id,
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
      <h1 className="text-2xl font-semibold">Orders</h1>
      <nav className="flex flex-wrap gap-1 border-b text-sm">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={tab === "all" ? "/orders" : `/orders?status=${tab}`}
            className={`px-3 py-2 capitalize ${
              activeStatus === tab ? "border-b-2 border-black font-semibold" : "text-gray-500"
            }`}
          >
            {tab}
          </Link>
        ))}
      </nav>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Date</th>
            <th className="py-2">Customer</th>
            <th className="py-2">Items</th>
            <th className="py-2">Total</th>
            <th className="py-2">Payment</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-gray-500">
                No orders{activeStatus !== "all" ? ` with status "${activeStatus}"` : " yet"}.
              </td>
            </tr>
          ) : (
            rows.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="py-2">
                  <Link href={`/orders/${order.id}`} className="block hover:underline">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Link>
                </td>
                <td className="py-2">{order.customerName}</td>
                <td className="py-2">{order.itemCount}</td>
                <td className="py-2">৳{order.total}</td>
                <td className="py-2 uppercase">
                  {order.paymentMethod}
                  <span className="ml-1 text-xs capitalize text-gray-500">({order.paymentStatus})</span>
                </td>
                <td className="py-2 capitalize">{order.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
