import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// Per-store credentials for the public read API (src/lib/api, /api/v1).
//
// DELIBERATELY OUTSIDE the app.current_store_id RLS boundary, like `stores`
// and `platform_invoices` (see src/db/context.ts): an incoming request
// carries only a Bearer token, so the lookup `WHERE token_hash = ?` has to
// run before any store context can be set — the same chicken/egg as staff
// login. There is no RLS policy and its migration adds none — not a rule
// #2 gap. Every access goes through src/lib/api/keys.ts: the resolver
// scopes by the token; the merchant's own /api-keys admin page scopes with
// an explicit `where store_id = session.user.storeId`.
//
// Only the SHA-256 `tokenHash` is stored; the plaintext token is shown to
// the merchant exactly once, at creation. `tokenPrefix` (e.g. "ak_a1b2c3d4")
// is not secret — it's shown in the key list so a merchant can tell which
// key is which. `scopes` is a comma-joined list validated on write against
// src/lib/api/scopes.ts (plain text, like stores.subscription_plan).
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    scopes: text("scopes").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    // The staff member who minted it. No FK — staff rows are tenant-scoped
    // and this is a loose audit note (cf. platform_invoices.verified_by_staff_id).
    createdByStaffId: uuid("created_by_staff_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("api_keys_store_id_idx").on(table.storeId),
    uniqueIndex("api_keys_token_hash_idx").on(table.tokenHash),
  ]
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
