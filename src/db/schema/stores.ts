import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { storeStatusEnum, subscriptionStatusEnum, billingCycleEnum } from "./enums";

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
    // Chosen on the "create store" form: a digital store may sell digital
    // (PDF) products alongside physical ones; a plain e-commerce store
    // never sees the digital-product option. Creation-time choice, no
    // later toggle. See src/lib/products/digital.ts.
    digitalEnabled: boolean("digital_enabled").notNull().default(false),
    // ── Platform billing (CLAUDE.md rule #3): the store's subscription to
    // AmarShop itself. Read/written only through src/lib/billing — never
    // mixed with the customer-facing Order/Payment/Invoice tables. These
    // columns live here (not a child table) because, like the rest of this
    // row, they're resolved before the app.current_store_id RLS GUC exists.
    // `subscriptionPlan` = the plan the merchant has committed to; the plan
    // whose limits actually apply right now (trial grants a higher tier) is
    // computed by effectivePlanId() in src/lib/billing/subscription.ts.
    subscriptionPlan: text("subscription_plan").notNull().default("free"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trialing"),
    subscriptionCycle: billingCycleEnum("subscription_cycle"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
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
