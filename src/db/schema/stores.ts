import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { storeStatusEnum } from "./enums";

// The tenant table itself — never store_id-scoped or RLS-restricted by
// app.current_store_id, since resolving *which* store a request belongs to
// (proxy.ts, by slug or custom domain) has to run before that session
// variable can be set. See src/db/context.ts for the RLS boundary this
// table deliberately sits outside of.
export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    customDomain: text("custom_domain"),
    // NULL = no custom domain, or one claimed but not yet DNS-verified.
    // Set = the CNAME/A check passed; only then does resolveStoreForHost()
    // serve on this host and /api/internal/domain-check authorize a cert.
    customDomainVerifiedAt: timestamp("custom_domain_verified_at", { withTimezone: true }),
    status: storeStatusEnum("status").notNull().default("pending"),
    // Seed/demo fixtures that deliberately look like real stores. Kept out
    // of any surface a real customer or merchant can reach in production
    // (CLAUDE.md rule #9) — see resolveHost in src/lib/tenant/resolve.ts.
    isDemo: boolean("is_demo").notNull().default(false),
    // Merchant's own ad-tracking ids, injected into their storefront's
    // <head> (src/components/storefront-analytics.tsx). Public identifiers,
    // not secrets — validated on save (src/lib/analytics/config.ts), so an
    // unvalidated value never reaches a <script>.
    metaPixelId: text("meta_pixel_id"),
    ga4MeasurementId: text("ga4_measurement_id"),
    // A variant with stock in (0, this] shows as a low-stock alert; 0 is
    // an out-of-stock alert. Read by the dashboard card and the admin
    // bell (src/lib/products/stock.ts) — one value, not a hardcoded const.
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    locale: text("locale").notNull().default("bn"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stores_slug_idx").on(table.slug),
    uniqueIndex("stores_custom_domain_idx").on(table.customDomain),
  ]
);

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
