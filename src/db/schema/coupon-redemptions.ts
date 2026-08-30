import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { coupons } from "./coupons";
import { orders } from "./orders";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// One row per successful coupon use, written inside the same transaction
// that increments coupons.used_count and creates the order. Powers the
// per-phone usage cap now and a "which coupon drove how much revenue"
// report later. discountAmount is a snapshot, like orders.discount_amount.
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerPhone: text("customer_phone").notNull(),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("coupon_redemptions_store_id_idx").on(table.storeId),
    index("coupon_redemptions_coupon_phone_idx").on(table.couponId, table.customerPhone),
  ]
);

export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type NewCouponRedemption = typeof couponRedemptions.$inferInsert;
