import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";
import { courierProviderEnum, shipmentStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// One courier booking per order. recipient* are a SNAPSHOT taken at
// booking time — a later edit to the order's address must not change what
// was handed to the courier. `codAmount` is what the courier collects on
// delivery (0 for a prepaid order). `status` is the normalised value; the
// courier's own last word is kept verbatim in `lastStatusRaw` for support.
export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: courierProviderEnum("provider").notNull(),
    status: shipmentStatusEnum("status").notNull().default("pending"),
    consignmentId: text("consignment_id"),
    trackingCode: text("tracking_code"),
    trackingUrl: text("tracking_url"),
    charge: numeric("charge", { precision: 10, scale: 2 }),
    codAmount: numeric("cod_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    recipientAddress: text("recipient_address").notNull(),
    lastStatusRaw: text("last_status_raw"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    bookedAt: timestamp("booked_at", { withTimezone: true }),
  },
  (table) => [
    index("shipments_store_id_idx").on(table.storeId),
    index("shipments_order_id_idx").on(table.orderId),
  ]
);

export type Shipment = typeof shipments.$inferSelect;
export type NewShipment = typeof shipments.$inferInsert;
