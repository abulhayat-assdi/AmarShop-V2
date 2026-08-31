import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// Cross-tenant order rollups for the platform-admin dashboard. orders is
// RLS + FORCE, so this goes through the platform_store_stats() SECURITY
// DEFINER function (migration 0027) — the one sanctioned cross-tenant read
// path, granted to amarshop_app only. Aggregates only; no order rows, no
// PII. Canceled + quota-locked orders are excluded there.

export type StoreStat = {
  storeId: string;
  orderCount: number;
  gmv: number;
  lastOrderAt: Date | null;
  ordersThisMonth: number;
};

type Row = {
  store_id: string;
  order_count: string | number;
  gmv: string | number;
  last_order_at: string | Date | null;
  orders_this_month: string | number;
};

export async function getStoreStats(): Promise<Map<string, StoreStat>> {
  const rows = await db.execute<Row>(sql`select * from platform_store_stats()`);
  const map = new Map<string, StoreStat>();
  for (const r of rows) {
    map.set(r.store_id, {
      storeId: r.store_id,
      orderCount: Number(r.order_count),
      gmv: Number(r.gmv),
      lastOrderAt: r.last_order_at ? new Date(r.last_order_at) : null,
      ordersThisMonth: Number(r.orders_this_month),
    });
  }
  return map;
}
