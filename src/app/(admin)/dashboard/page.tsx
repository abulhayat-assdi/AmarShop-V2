import Link from "next/link";
import { and, eq, ne, gt, lte, lt, gte, desc, isNull, sql, type SQL } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, productVariants, products, categories, stores } from "@/db/schema";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/products/stock";
import { getRestockSoon, forecastLevel } from "@/lib/products/forecast";
import { WeeklySalesChart } from "./WeeklySalesChart";
import { PERIODS, PERIOD_LABEL_KEYS, parsePeriod, getDateRange, type Period } from "./period";
import { ORDER_STATUS_KEYS } from "@/lib/enum-labels";
import { DateInput } from "@/components/date-input";
import { getTranslator } from "@/lib/i18n/server";

// SITE_STRUCTURE.md's Dashboard route is "/", but that path is already the
// storefront homepage (or the platform landing page) depending on host —
// see src/app/page.tsx's routing note. /dashboard is a real, unambiguous
// path instead, same reasoning as redirecting login to /orders earlier.
//
// Every stat here is a live query against real data — no hardcoded or
// aspirational numbers (CLAUDE.md rule #8). There's no customer-account
// system (guest checkout only), so "Customers" counts distinct phone
// numbers across real orders rather than faking an account count.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period: rawPeriod, from, to } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const { start, end } = getDateRange(period, from, to);
  const session = await requireStaffSession();
  const { t, locale } = await getTranslator();
  const weekdayLocale = locale === "bn" ? "bn-BD" : "en-US";

  // A variant with stock in (0, threshold] is "low", 0 is out of stock
  // (out-of-stock is the products page / bell's concern). One value,
  // stores.low_stock_threshold, shared with src/lib/products/stock.ts.
  const [storeRow] = await db
    .select({ lowStockThreshold: stores.lowStockThreshold })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const lowStockThreshold = storeRow?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

  const stats = await withStoreContext(session.user.storeId, async (tx) => {
    const storeId = session.user.storeId;
    const dateConditions: SQL[] = [];
    if (start) dateConditions.push(gte(orders.createdAt, start));
    if (end) dateConditions.push(lte(orders.createdAt, end));
    // Over-quota (locked) orders are hidden from the merchant everywhere,
    // including every figure on this dashboard, until they upgrade.
    const notLocked = isNull(orders.quotaLockedAt);

    const [summary] = await tx
      .select({
        totalSales: sql<string>`coalesce(sum(${orders.total}), 0)`,
        orderCount: sql<number>`count(*)`,
        customerCount: sql<number>`count(distinct ${orders.customerPhone})`,
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), notLocked, ne(orders.status, "canceled"), ...dateConditions));

    // Not tied to the period — a live inventory snapshot, not a historical figure.
    const [lowStock] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(productVariants.storeId, storeId),
          ne(products.isDigital, true),
          gt(productVariants.quantity, 0),
          lte(productVariants.quantity, lowStockThreshold)
        )
      );

    const recentOrders = await tx
      .select({
        id: orders.id,
        customerName: orders.customerName,
        total: orders.total,
        status: orders.status,
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), notLocked))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    const topProducts = await tx
      .select({
        productName: orderItems.productName,
        totalQuantity: sql<number>`sum(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orderItems.storeId, storeId), notLocked, ne(orders.status, "canceled"), ...dateConditions))
      .groupBy(orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5);

    // Attributing a sale to a category requires the live product/variant
    // chain (order_items only snapshots name/SKU/price, not category) — a
    // sale whose variant or product was later deleted can't be attributed
    // here. No delete-product feature exists yet, so this is a real but
    // currently-unreachable edge case, not a bug worth a schema change for.
    const topCategories = await tx
      .select({
        categoryName: categories.name,
        totalQuantity: sql<number>`sum(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(productVariants, eq(productVariants.id, orderItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(orderItems.storeId, storeId), notLocked, ne(orders.status, "canceled"), ...dateConditions))
      .groupBy(categories.name)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5);

    // Trailing 7 calendar days, always — a fixed "weekly" widget,
    // independent of the period/custom-range selector above.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailySalesRows = await tx
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${orders.total}), 0)`,
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), notLocked, ne(orders.status, "canceled"), gte(orders.createdAt, sevenDaysAgo)))
      .groupBy(sql`date_trunc('day', ${orders.createdAt})`);

    const salesByDay = new Map(dailySalesRows.map((row) => [row.day, Number(row.total)]));
    const chartDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      return {
        label: date.toLocaleDateString(weekdayLocale, { weekday: "short" }),
        total: salesByDay.get(key) ?? 0,
      };
    });

    // Not meaningful without a lower bound (nothing to compare "before" —
    // everyone would trivially show as "new"): "all", or "custom" before
    // a from-date has actually been picked.
    let customerBreakdown: { newCount: number; returningCount: number } | null = null;
    if (start) {
      const periodPhones = await tx
        .selectDistinct({ phone: orders.customerPhone })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), notLocked, ne(orders.status, "canceled"), ...dateConditions));

      let newCount = 0;
      let returningCount = 0;
      for (const { phone } of periodPhones) {
        const [priorOrder] = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.storeId, storeId),
              notLocked,
              eq(orders.customerPhone, phone),
              ne(orders.status, "canceled"),
              lt(orders.createdAt, start)
            )
          )
          .limit(1);
        if (priorOrder) returningCount += 1;
        else newCount += 1;
      }
      customerBreakdown = { newCount, returningCount };
    }

    return {
      totalSales: summary?.totalSales ?? "0",
      orderCount: summary?.orderCount ?? 0,
      customerCount: summary?.customerCount ?? 0,
      lowStockCount: lowStock?.count ?? 0,
      recentOrders,
      topProducts,
      topCategories,
      chartDays,
      customerBreakdown,
    };
  });

  const restockSoon = await getRestockSoon(session.user.storeId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("admin.dashboard.title")}</h1>
        <nav className="flex gap-1 text-sm">
          {PERIODS.map((tab) => (
            <PeriodTab
              key={tab}
              tab={tab}
              active={period === tab}
              label={t(PERIOD_LABEL_KEYS[tab])}
            />
          ))}
        </nav>
      </div>

      {period === "custom" && (
        <form action="/dashboard" className="flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="period" value="custom" />
          <label className="flex items-center gap-1">
            {t("admin.common.from")}
            <DateInput
              name="from"
              defaultValue={from}
              required
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1">
            {t("admin.common.to")}
            <DateInput
              name="to"
              defaultValue={to}
              required
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <button type="submit" className="rounded bg-black px-3 py-1 text-white hover:bg-gray-800">
            {t("admin.common.apply")}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t("admin.dashboard.totalSales")} value={`৳${stats.totalSales}`} />
        <StatCard label={t("admin.dashboard.orders")} value={stats.orderCount} href="/orders" />
        <StatCard label={t("admin.dashboard.customers")} value={stats.customerCount} />
        <StatCard label={t("admin.dashboard.lowStock")} value={stats.lowStockCount} href="/products" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-3 font-semibold">{t("admin.dashboard.salesLast7")}</h2>
          <WeeklySalesChart days={stats.chartDays} />
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-3 font-semibold">
            {t("admin.dashboard.customersIn", { period: t(PERIOD_LABEL_KEYS[period]) })}
          </h2>
          {stats.customerBreakdown ? (
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-2xl font-semibold">{stats.customerBreakdown.newCount}</p>
                <p className="text-gray-500">{t("admin.dashboard.newCustomers")}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.customerBreakdown.returningCount}</p>
                <p className="text-gray-500">{t("admin.dashboard.returningCustomers")}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {period === "custom"
                ? t("admin.dashboard.pickDates")
                : t("admin.dashboard.selectPeriod")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded border p-4">
          <h2 className="mb-3 font-semibold">{t("admin.dashboard.recentOrders")}</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">{t("admin.dashboard.noOrders")}</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {stats.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <Link href={`/orders/${order.id}`} className="hover:underline">
                      {order.customerName}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {t(ORDER_STATUS_KEYS[order.status])}
                    </span>
                  </div>
                  <span>৳{order.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-3 font-semibold">{t("admin.dashboard.topProducts")}</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">{t("admin.dashboard.noSales")}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {stats.topProducts.map((product) => (
                <li key={product.productName} className="flex items-center justify-between">
                  <span>{product.productName}</span>
                  <span className="text-gray-500">
                    {t("admin.common.soldCount", { count: product.totalQuantity })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-3 font-semibold">{t("admin.dashboard.restockSoon")}</h2>
          {restockSoon.length === 0 ? (
            <p className="text-sm text-gray-500">{t("admin.dashboard.restockSoonEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {restockSoon.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-2">
                  <Link href={`/products/${item.productId}/edit`} className="hover:underline">
                    {item.name}
                  </Link>
                  <span
                    className={
                      forecastLevel(item.daysLeft) === "critical"
                        ? "text-red-600"
                        : "text-amber-600"
                    }
                  >
                    {t("admin.dashboard.daysLeftShort", { days: item.daysLeft })} ·{" "}
                    {t("admin.dashboard.inStockShort", { count: item.quantity })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-3 font-semibold">{t("admin.dashboard.topCategories")}</h2>
          {stats.topCategories.length === 0 ? (
            <p className="text-sm text-gray-500">{t("admin.dashboard.noSales")}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {stats.topCategories.map((category) => (
                <li key={category.categoryName} className="flex items-center justify-between">
                  <span>{category.categoryName}</span>
                  <span className="text-gray-500">
                    {t("admin.common.soldCount", { count: category.totalQuantity })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function PeriodTab({ tab, active, label }: { tab: Period; active: boolean; label: string }) {
  return (
    <Link
      href={tab === "all" ? "/dashboard" : `/dashboard?period=${tab}`}
      className={`rounded px-3 py-1.5 ${active ? "bg-black text-white" : "text-gray-500 hover:bg-gray-100"}`}
    >
      {label}
    </Link>
  );
}

function StatCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <div className="rounded border p-4 hover:border-gray-400">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
