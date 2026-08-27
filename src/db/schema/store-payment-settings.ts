import { pgTable, uuid, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// Tenant-scoped: one row per store (store_id unique). RLS policy for this
// table is defined in its migration file — see src/db/migrations.
//
// Per-store payment gateway credentials. `secrets` is the AES-256-GCM
// ciphertext (src/lib/crypto/secret.ts) of a JSON blob
// { [gateway]: Record<string,string> } — currently just
// { sslcommerz: { storeId, storePassword } }; future gateways slot into
// the same blob. Never read this column into anything the client sees.
export const storePaymentSettings = pgTable(
  "store_payment_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    sandbox: boolean("sandbox").notNull().default(true),
    secrets: text("secrets"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("store_payment_settings_store_id_idx").on(table.storeId)]
);

export type StorePaymentSettings = typeof storePaymentSettings.$inferSelect;
export type NewStorePaymentSettings = typeof storePaymentSettings.$inferInsert;
