import { pgTable, uuid, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { courierProviderEnum } from "./enums";

// Tenant-scoped: one row per store (store_id unique). RLS policy for this
// table is defined in its migration file — see src/db/migrations.
//
// Which courier a merchant has switched on, plus their API credentials.
// `secrets` is the AES-256-GCM ciphertext (see src/lib/crypto/secret.ts) of
// a JSON blob { [provider]: Record<string,string> } — kept per-provider so
// switching the active provider doesn't discard the other's saved keys.
// Never read this column into anything the client sees.
export const storeCourierSettings = pgTable(
  "store_courier_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    activeProvider: courierProviderEnum("active_provider"),
    sandbox: boolean("sandbox").notNull().default(true),
    secrets: text("secrets"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("store_courier_settings_store_id_idx").on(table.storeId)]
);

export type StoreCourierSettings = typeof storeCourierSettings.$inferSelect;
export type NewStoreCourierSettings = typeof storeCourierSettings.$inferInsert;
