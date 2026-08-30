import { pgTable, uuid, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { smsProviderEnum } from "./enums";

// Tenant-scoped: one row per store (store_id unique). RLS policy for this
// table is defined in its migration file — see src/db/migrations.
//
// Which SMS gateway a merchant has switched on, plus its credentials.
// `secrets` is the AES-256-GCM ciphertext (src/lib/crypto/secret.ts) of a
// JSON blob { [provider]: Record<string,string> } — kept per-provider so
// switching providers doesn't discard the other's keys. Never read this
// column into anything the client sees.
export const storeSmsSettings = pgTable(
  "store_sms_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    provider: smsProviderEnum("provider"),
    // The approved SMS sender mask / brand name, shown as the "from".
    senderId: text("sender_id"),
    sandbox: boolean("sandbox").notNull().default(true),
    secrets: text("secrets"),
    notifyOrderPlaced: boolean("notify_order_placed").notNull().default(true),
    notifyOrderShipped: boolean("notify_order_shipped").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("store_sms_settings_store_id_idx").on(table.storeId)]
);

export type StoreSmsSettings = typeof storeSmsSettings.$inferSelect;
export type NewStoreSmsSettings = typeof storeSmsSettings.$inferInsert;
