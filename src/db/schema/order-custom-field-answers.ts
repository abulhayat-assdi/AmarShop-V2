import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";
import { checkoutCustomFields } from "./checkout-custom-fields";

// One customer's answer to one checkout_custom_fields question, snapshot
// at order time (label + value both copied, like payments.walletProvider
// etc. are copied rather than re-derived) — so editing or deleting the
// field definition later never changes what an existing order shows.
// `fieldId` is kept (nullable, set-null on delete) only so the admin
// order view could later group/filter by field; nothing reads it yet.
// Tenant-scoped, ordinary RLS table.
export const orderCustomFieldAnswers = pgTable(
  "order_custom_field_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id").references(() => checkoutCustomFields.id, { onDelete: "set null" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_custom_field_answers_store_id_idx").on(table.storeId),
    index("order_custom_field_answers_order_id_idx").on(table.orderId),
  ]
);

export type OrderCustomFieldAnswer = typeof orderCustomFieldAnswers.$inferSelect;
export type NewOrderCustomFieldAnswer = typeof orderCustomFieldAnswers.$inferInsert;
