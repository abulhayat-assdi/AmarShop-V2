import { and, asc, eq, lte, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { productVariants, products } from "@/db/schema";

// Fallback only — the real threshold is stores.low_stock_threshold
// (default 5). Kept so callers without a store row still have a number.
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StockAlert = {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  kind: "out" | "low";
};

// Every variant at or below `threshold`, out-of-stock first. `alerts` is
// capped at `limit` for the dropdown; `total` is the full count so the UI
// can show "+N more". The one place stock alerts are computed — the
// dashboard card and the admin bell both call this.
export async function getStockAlerts(
  storeId: string,
  threshold: number,
  limit = 20
): Promise<{ alerts: StockAlert[]; total: number }> {
  return withStoreContext(storeId, async (tx) => {
    const where = and(
      eq(productVariants.storeId, storeId),
      lte(productVariants.quantity, threshold)
    );

    const rows = await tx
      .select({
        productId: products.id,
        productName: products.name,
        sku: productVariants.sku,
        quantity: productVariants.quantity,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(where)
      .orderBy(asc(productVariants.quantity), asc(products.name))
      .limit(limit);

    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(productVariants)
      .where(where);

    return {
      total,
      alerts: rows.map((r) => ({ ...r, kind: r.quantity === 0 ? "out" : "low" }) as StockAlert),
    };
  });
}
