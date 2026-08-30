import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";
import { smsMessageStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// The SMS outbox: one row per send attempt (src/lib/sms/notifications.ts),
// written `pending` then updated to `sent` / `failed`. An audit trail now,
// and the foundation for a retry worker later. `event` is a plain string
// (e.g. "order_placed", "order_shipped").
export const smsMessages = pgTable(
  "sms_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    toPhone: text("to_phone").notNull(),
    body: text("body").notNull(),
    event: text("event").notNull(),
    status: smsMessageStatusEnum("status").notNull().default("pending"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sms_messages_store_id_idx").on(table.storeId)]
);

export type SmsMessage = typeof smsMessages.$inferSelect;
export type NewSmsMessage = typeof smsMessages.$inferInsert;
