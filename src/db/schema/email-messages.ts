import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { emailMessageStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// The outbox log behind Admin -> Email Gateways' "recent" list, mirroring
// sms_messages. Today the only sender is the settings page's own "Send
// test email" action (src/lib/email/send-test.ts) — no storefront/order
// feature emits email yet, so there's no `event` column to distinguish
// (unlike sms_messages.event).
export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    status: emailMessageStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("email_messages_store_id_created_at_idx").on(table.storeId, table.createdAt)]
);

export type EmailMessage = typeof emailMessages.$inferSelect;
export type NewEmailMessage = typeof emailMessages.$inferInsert;
