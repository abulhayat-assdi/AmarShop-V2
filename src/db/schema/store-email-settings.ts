import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { emailProviderEnum } from "./enums";

// Tenant-scoped: one row per store (store_id unique). RLS policy for this
// table is defined in its migration file — see src/db/migrations.
//
// Admin -> Email Gateways. Which transactional email provider a merchant
// has switched on. `host`/`port`/`secure` are plain connection settings
// (not secret) — auto-filled from a provider preset in the admin form
// (src/lib/email/providers.ts) but freely editable, since ses/smtp have
// no fixed host. `secrets` is the AES-256-GCM ciphertext
// (src/lib/crypto/secret.ts) of a JSON blob { [provider]: { username,
// password } }, keyed per provider like store_sms_settings.secrets so
// switching providers doesn't discard the other's credentials. Never read
// this column into anything the client sees.
export const storeEmailSettings = pgTable(
  "store_email_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    provider: emailProviderEnum("provider"),
    fromName: text("from_name"),
    fromEmail: text("from_email"),
    host: text("host"),
    port: integer("port"),
    secure: boolean("secure").notNull().default(false),
    secrets: text("secrets"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("store_email_settings_store_id_idx").on(table.storeId)]
);

export type StoreEmailSettings = typeof storeEmailSettings.$inferSelect;
export type NewStoreEmailSettings = typeof storeEmailSettings.$inferInsert;
