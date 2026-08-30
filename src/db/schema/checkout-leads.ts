import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { carts } from "./carts";
import { deliveryZones } from "./delivery-zones";
import { checkoutLeadStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// One row per cart (cart_id unique). Written by the storefront checkout
// form as the customer types (debounced, once name + a valid phone are
// present) — src/lib/checkout-leads.ts. Powers the admin "Incomplete
// Checkouts" list, where the merchant calls to confirm whether the
// customer still wants to order. A completed order flips status to
// "converted" and keeps the row (conversion analytics).
export const checkoutLeads = pgTable(
  "checkout_leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerAddress: text("customer_address"),
    deliveryZoneId: uuid("delivery_zone_id").references(() => deliveryZones.id, {
      onDelete: "set null",
    }),
    status: checkoutLeadStatusEnum("status").notNull().default("pending"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("checkout_leads_cart_id_idx").on(table.cartId),
    index("checkout_leads_store_id_idx").on(table.storeId),
    index("checkout_leads_store_status_seen_idx").on(
      table.storeId,
      table.status,
      table.lastSeenAt
    ),
  ]
);

export type CheckoutLead = typeof checkoutLeads.$inferSelect;
export type NewCheckoutLead = typeof checkoutLeads.$inferInsert;
