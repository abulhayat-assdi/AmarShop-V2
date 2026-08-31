import { and, asc, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import {
  categories,
  coupons,
  orders,
  platformInvoices,
  products,
  staffMembers,
  stores,
} from "@/db/schema";
import type { PlatformInvoice, Store } from "@/db/schema";
import { DEFAULT_LOW_STOCK_THRESHOLD, getStockAlerts } from "@/lib/products/stock";
import { getOrderQuota, monthStartDhaka, type OrderQuotaView } from "@/lib/billing/order-quota";

// Everything the platform-admin store-detail page needs. The store row
// itself is outside RLS (plain db); the store's own tenant tables are read
// via withStoreContext(storeId, …) — a deliberate, requirePlatformAdmin-
// gated cross-tenant read (withStoreContext only sets the GUC, it does not
// check that the caller owns the store).

export type StoreStaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "owner" | "admin" | "staff";
  isPlatformAdmin: boolean;
  createdAt: Date;
};

export type StoreDetailView = {
  store: Store;
  staff: StoreStaffRow[];
  products: { total: number; draft: number; active: number; archived: number; digital: number };
  categories: number;
  activeCoupons: number;
  lowStockCount: number;
  orders: { allTime: number; thisMonth: number; gmv: number; lastOrderAt: Date | null };
  quota: OrderQuotaView;
  invoices: PlatformInvoice[];
};

export async function getStoreDetail(storeId: string): Promise<StoreDetailView | null> {
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) return null;

  const monthStart = monthStartDhaka();
  const notCanceledUnlocked = and(
    eq(orders.storeId, storeId),
    ne(orders.status, "canceled"),
    isNull(orders.quotaLockedAt)
  );

  const inner = await withStoreContext(storeId, async (tx) => {
    const staff = await tx
      .select({
        id: staffMembers.id,
        name: staffMembers.name,
        email: staffMembers.email,
        phone: staffMembers.phone,
        role: staffMembers.role,
        isPlatformAdmin: staffMembers.isPlatformAdmin,
        createdAt: staffMembers.createdAt,
      })
      .from(staffMembers)
      .where(eq(staffMembers.storeId, storeId))
      .orderBy(asc(staffMembers.role), asc(staffMembers.createdAt));

    const prodRows = await tx
      .select({
        status: products.status,
        isDigital: products.isDigital,
        n: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(eq(products.storeId, storeId))
      .groupBy(products.status, products.isDigital);

    const [{ cat }] = await tx
      .select({ cat: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.storeId, storeId));

    const [{ cpn }] = await tx
      .select({ cpn: sql<number>`count(*)::int` })
      .from(coupons)
      .where(and(eq(coupons.storeId, storeId), eq(coupons.isActive, true)));

    const [allTimeRow] = await tx
      .select({
        n: sql<number>`count(*)::int`,
        gmv: sql<string>`coalesce(sum(${orders.total}), 0)`,
        last: sql<string | null>`max(${orders.createdAt})`,
      })
      .from(orders)
      .where(notCanceledUnlocked);

    const [monthRow] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(notCanceledUnlocked, gte(orders.createdAt, monthStart)));

    return { staff, prodRows, cat, cpn, allTimeRow, monthRow };
  });

  const products_ = { total: 0, draft: 0, active: 0, archived: 0, digital: 0 };
  for (const r of inner.prodRows) {
    products_.total += r.n;
    products_[r.status] += r.n;
    if (r.isDigital) products_.digital += r.n;
  }

  const { total: lowStockCount } = await getStockAlerts(
    storeId,
    store.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    1
  );

  const quota = await getOrderQuota(storeId);

  const invoices = await db
    .select()
    .from(platformInvoices)
    .where(eq(platformInvoices.storeId, storeId))
    .orderBy(desc(platformInvoices.createdAt));

  return {
    store,
    staff: inner.staff,
    products: products_,
    categories: inner.cat,
    activeCoupons: inner.cpn,
    lowStockCount,
    orders: {
      allTime: inner.allTimeRow.n,
      thisMonth: inner.monthRow.n,
      gmv: Number(inner.allTimeRow.gmv),
      lastOrderAt: inner.allTimeRow.last ? new Date(inner.allTimeRow.last) : null,
    },
    quota,
    invoices,
  };
}
