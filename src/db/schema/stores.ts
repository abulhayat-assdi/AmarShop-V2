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
    // Merchant's own support contact info, shown to their customers (Admin
    // → Support, SITE_STRUCTURE.md Part B). All optional/nullable — leave
    // blank rather than ship a fake placeholder (CLAUDE.md rule #8).
    supportEmail: text("support_email"),
    supportPhone: text("support_phone"),
    supportHours: text("support_hours"),
    // Admin → Guest Checkout & OTP. This store is guest-checkout-only (no
    // customer accounts — see orders.ts), so there is no "login required"
    // mode to toggle; this is specifically "require the customer to verify
    // their phone via SMS OTP before an order is placed" (a common
    // BD-market anti-fake-COD-order measure). The settings page keeps this
    // off (and disabled) until store_sms_settings has a real provider
    // connected — see src/lib/sms/settings.ts's getSmsSettingsView().
    checkoutOtpRequired: boolean("checkout_otp_required").notNull().default(false),
    // Admin -> Account (General Settings -> Company tab). Business profile
    // shown on invoices/documents down the line; `name` above already
    // covers the store's display name, this is the rest.
    businessAddress: text("business_address"),
    timezone: text("timezone").notNull().default("Asia/Dhaka"),
    currency: text("currency").notNull().default("BDT"),
    // Admin -> Account (General Settings -> System tab). Merchant-toggled:
    // when true, (storefront)/layout.tsx shows a "closed for maintenance"
    // page instead of the normal storefront. Distinct from `status`
    // ("suspended" is platform/billing-driven and 404s at resolution —
    // src/lib/tenant/resolve.ts — this is merchant-driven and resolves
    // normally, then renders a friendly page).
    maintenanceMode: boolean("maintenance_mode").notNull().default(false),
    // Admin -> Account (General Settings -> System tab) "Request store
    // deletion." Deliberately NOT a self-service hard delete — an owner
    // can request it (typed store-name confirmation), which sets this
    // timestamp, writes an audit_logs row, and raises a critical notice;
    // a platform admin completes it via the existing slug-confirmed hard
    // delete at /platform/stores/[id]. Irreversible data loss stays a
    // platform-admin action, never a single in-product click.
    deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
    // Admin -> Appearance (src/lib/appearance/logo.ts). Public URL, same
    // "URL persisted, not the storage key" convention as oauth_apps.logo_url
    // — logos are single-field-per-row, unlike product_media's collection.
    logoUrl: text("logo_url"),
    // A single brand accent color, hex (#RRGGBB). No secondary/typography
    // yet — see CLAUDE.md's "Deliberately not built" note on why a font
    // picker is deferred (Bengali-glyph risk).
    primaryColor: text("primary_color"),
    // Admin -> Appearance -> Footer. A short tagline shown under the store
    // name, plus optional social links — the "Headers/Footers" backlog
    // item folded into two plain fields rather than an invented
    // drag-and-drop widget builder (no precedent anywhere in this repo).
    footerTagline: text("footer_tagline"),
    socialWhatsapp: text("social_whatsapp"),
    socialFacebook: text("social_facebook"),
    socialInstagram: text("social_instagram"),
    // Admin -> Default Pages. Show/hide + reorder the homepage's two
    // existing sections (src/app/page.tsx) — not a block/content editor,
    // just toggling and typed-order-numbering what's already there. See
    // CLAUDE.md's "Deliberately not built" note on why a real section
    // builder is out of scope this round.
    homeShowCategories: boolean("home_show_categories").notNull().default(true),
    homeCategoriesOrder: integer("home_categories_order").notNull().default(1),
    homeShowNewArrivals: boolean("home_show_new_arrivals").notNull().default(true),
    homeNewArrivalsOrder: integer("home_new_arrivals_order").notNull().default(2),
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
