import { pgTable, uuid, text, integer, numeric, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { discountTypeEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// An order-level promotion the customer unlocks by typing `code` at
// checkout. Judged in exactly one place: src/lib/coupons/validate.ts.
// usedCount is incremented with a guarded UPDATE inside the order
// transaction (src/lib/orders/create.ts), never re-derived from
// coupon_redemptions.
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    // Stored uppercase; the checkout lookup upper-cases the customer's input.
    code: text("code").notNull(),
    type: discountTypeEnum("type").notNull(),
    // Percent (0–100) or taka; ignored for "free_delivery".
    value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
    // Minimum order subtotal (before delivery) for the coupon to apply.
    minSubtotal: numeric("min_subtotal", { precision: 12, scale: 2 }),
    // NULL = unlimited. usedCount is the live counter the guard checks.
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    // NULL = no per-customer cap. Guest checkout keys this on phone number.
    maxUsesPerPhone: integer("max_uses_per_phone"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("coupons_store_id_idx").on(table.storeId),
    uniqueIndex("coupons_store_id_code_idx").on(table.storeId, table.code),
  ]
);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
