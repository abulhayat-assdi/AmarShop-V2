import { and, eq, gte, ne, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, productVariants, products } from "@/db/schema";

export const FORECAST_WINDOW_DAYS = 30;
// Days-of-stock-left thresholds — the single source for both the badge
// colour (forecastLevel) and the dashboard "Restock soon" cutoff.
export const FORECAST_CRITICAL_DAYS = 7;
export const FORECAST_LOW_DAYS = 14;

export type ProductForecast = {
  productId: string;
  sold: number;
  perDay: number;
  // Days of stock left at the recent pace. null = no sales in the window,
  // so there's nothing to project from.
  daysLeft: number | null;
};

export type ForecastLevel = "critical" | "low" | "ok" | "none";

export function forecastLevel(daysLeft: number | null): ForecastLevel {
  if (daysLeft == null) return "none";
  if (daysLeft < FORECAST_CRITICAL_DAYS) return "critical";
  if (daysLeft < FORECAST_LOW_DAYS) return "low";
  return "ok";
}

function windowCutoff(): Date {
  return new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

type VelocityRow = { productId: string; quantity: number; sold: number };

async function velocityRows(storeId: string): Promise<VelocityRow[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select({
        productId: productVariants.productId,
        quantity: productVariants.quantity,
        sold: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(productVariants, eq(productVariants.id, orderItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(orderItems.storeId, storeId),
          ne(orders.status, "canceled"),
          ne(products.isDigital, true),
          gte(orders.createdAt, windowCutoff())
        )
      )
      .groupBy(productVariants.productId, productVariants.quantity)
  );
}

function toForecast(row: VelocityRow): ProductForecast {
  const perDay = row.sold / FORECAST_WINDOW_DAYS;
  return {
    productId: row.productId,
    sold: row.sold,
    perDay,
    daysLeft: perDay > 0 ? Math.floor(row.quantity / perDay) : null,
  };
}

// One product = one variant today, so keyed by productId.
export async function getProductForecasts(
  storeId: string
): Promise<Map<string, ProductForecast>> {
  const rows = await velocityRows(storeId);
  return new Map(rows.map((r) => [r.productId, toForecast(r)]));
}

export type RestockItem = {
  productId: string;
  name: string;
  quantity: number;
  daysLeft: number;
};

// Products whose stock runs out soonest at the recent pace — for the
// dashboard "Restock soon" panel.
export async function getRestockSoon(storeId: string, limit = 5): Promise<RestockItem[]> {
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({
        productId: productVariants.productId,
        name: products.name,
        quantity: productVariants.quantity,
        sold: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(productVariants, eq(productVariants.id, orderItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(orderItems.storeId, storeId),
          ne(orders.status, "canceled"),
          ne(products.isDigital, true),
          gte(orders.createdAt, windowCutoff())
        )
      )
      .groupBy(productVariants.productId, products.name, productVariants.quantity)
  );

  return rows
    .map((r) => {
      const perDay = r.sold / FORECAST_WINDOW_DAYS;
      return {
        productId: r.productId,
        name: r.name,
        quantity: r.quantity,
        daysLeft: perDay > 0 ? Math.floor(r.quantity / perDay) : Infinity,
      };
    })
    .filter((r) => r.daysLeft < FORECAST_LOW_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}
