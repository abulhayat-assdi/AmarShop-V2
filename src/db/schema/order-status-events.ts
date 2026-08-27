import { pgTable, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";
import { orderStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// Audit trail for the order status pipeline. This slice only ever inserts
// one "placed" row per order — a staff-facing order-management UI to move
// orders through the rest of the pipeline is a separate, later slice
// (PROJECT_PLAN.md's "manual order management" deliverable).
export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_status_events_store_id_idx").on(table.storeId),
    index("order_status_events_order_id_idx").on(table.orderId),
  ]
);

export type OrderStatusEvent = typeof orderStatusEvents.$inferSelect;
export type NewOrderStatusEvent = typeof orderStatusEvents.$inferInsert;
