import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { platformInvoiceStatusEnum, billingCycleEnum, walletProviderEnum } from "./enums";

// The platform billing a merchant for their subscription plan — the
// merchant-pays-AmarShop system (CLAUDE.md rule #3). NEVER to be confused
// with or merged into Order / Payment / Invoice (a customer paying a
// merchant). Its module is src/lib/billing, kept separate from
// src/lib/payments.
//
// DELIBERATELY OUTSIDE the app.current_store_id RLS boundary, exactly like
// `stores` (see src/db/context.ts): this is platform-owned data *about* a
// tenant, not storefront-request-path data. The platform admin reads it
// cross-tenant to verify payments; the merchant's own Billing page scopes
// it with an explicit `where storeId = session.user.storeId`. There is no
// RLS policy for this table and its migration adds none — that is not a
// rule #2 gap, it's the same call `stores` makes. All access goes through
// src/lib/billing/subscription.ts, which always takes an explicit storeId.
//
// Payment is manual bKash / Nagad "Send Money" (no gateway): a `pending`
// row is created when the merchant picks a plan; the merchant sends money
// to the platform's wallet number and submits the wallet + sender number +
// TrxID (stored on this row); a platform admin verifies by hand and marks
// it `paid`, which advances the store's subscription_* columns.
export const platformInvoices = pgTable(
  "platform_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    // The plan id (src/lib/billing/plans.ts) this invoice is for — plain
    // text, not an enum, so re-pricing/renaming tiers is a constants edit.
    plan: text("plan").notNull(),
    cycle: billingCycleEnum("cycle").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: platformInvoiceStatusEnum("status").notNull().default("pending"),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    // The merchant's manual-payment report — null until they submit it.
    walletProvider: walletProviderEnum("wallet_provider"),
    senderMsisdn: text("sender_msisdn"),
    senderReference: text("sender_reference"),
    // Platform-admin verification.
    paidAt: timestamp("paid_at", { withTimezone: true }),
    // The platform-admin staff id that confirmed it. No FK — staff rows are
    // tenant-scoped and this is a platform-side audit note, kept loose.
    verifiedByStaffId: uuid("verified_by_staff_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("platform_invoices_store_id_idx").on(table.storeId),
    index("platform_invoices_status_idx").on(table.status),
  ]
);

export type PlatformInvoice = typeof platformInvoices.$inferSelect;
export type NewPlatformInvoice = typeof platformInvoices.$inferInsert;
