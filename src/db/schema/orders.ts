import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { deliveryZones } from "./delivery-zones";
import { orderStatusEnum, paymentMethodEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// Guest checkout — no customerId. Name/phone/address are collected
// directly on the order, matching SITE_STRUCTURE.md's audited checkout.
//
// deliveryCharge is a SNAPSHOT of the zone's charge at order time, not
// re-derived from deliveryZones later — a merchant changing a zone's price
// must never alter what a past order shows it charged.
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    // Per-store random, human-facing reference (K7M2-9XQ4). Deliberately
    // not sequential — it doubles as the /track lookup key alongside the
    // customer's phone, and a guessable one would be enumerable. See
    // src/lib/orders/number.ts. Unique per store.
    orderCode: text("order_code").notNull(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerAddress: text("customer_address").notNull(),
    // Optional — the checkout form doesn't require it (matching
    // SITE_STRUCTURE.md's audited checkout), but collects it optionally
    // for a payment receipt / SSLCommerz's mandatory cus_email field.
    customerEmail: text("customer_email"),
    deliveryZoneId: uuid("delivery_zone_id").references(() => deliveryZones.id, {
      onDelete: "set null",
    }),
    deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    // Coupon SNAPSHOT — like deliveryCharge, frozen at order time. A later
    // edit to the coupon must never change what a past order shows.
    // discountAmount already has delivery-charge waivers folded in, so
    // total = subtotal - discountAmount + deliveryCharge always holds.
    couponCode: text("coupon_code"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    status: orderStatusEnum("status").notNull().default("placed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_store_id_idx").on(table.storeId),
    uniqueIndex("orders_store_id_order_code_idx").on(table.storeId, table.orderCode),
  ]
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
