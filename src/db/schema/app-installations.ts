import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { stores } from "./stores";
import { oauthApps } from "./oauth-apps";

// One merchant's installation of an OAuth app, plus the per-store access
// token that install grants. Created by the /oauth/authorize consent
// action; the app uses `tokenPrefix`-style `ato_…` tokens as
// `Authorization: Bearer` on /api/v1 (same call sites as an API key).
// Revoked when the merchant uninstalls or a platform admin disables the
// parent app.
//
// DELIBERATELY OUTSIDE the app.current_store_id RLS boundary, for the same
// reason `api_keys` is (see src/db/schema/api-keys.ts): a /api/v1 request
// carries only a Bearer token, so `WHERE token_hash = ?` has to resolve
// the store BEFORE any store context can be set. All access goes through
// src/lib/oauth/install.ts — the resolver scopes by the token; the
// merchant's own Installed Apps page + uninstall scope with an explicit
// `where store_id = session.user.storeId`. Not a rule #2 gap.
//
// Only the SHA-256 `tokenHash` is stored. `tokenPrefix` ("ato_XXXXXXXX")
// is not secret — it names a token in the merchant's Installed Apps list.
// The partial unique index keeps at most one live install per (app, store).
export const appInstallations = pgTable(
  "app_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => oauthApps.id, { onDelete: "cascade" }),
    scopes: text("scopes").notNull(),
    tokenHash: text("token_hash").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    tokenLastUsedAt: timestamp("token_last_used_at", { withTimezone: true }),
    // The staff member who approved the install. No FK — staff rows are
    // tenant-scoped and this is a loose audit note (cf.
    // api_keys.created_by_staff_id).
    installedByStaffId: uuid("installed_by_staff_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("app_installations_store_id_idx").on(table.storeId),
    index("app_installations_app_id_idx").on(table.appId),
    uniqueIndex("app_installations_token_hash_idx").on(table.tokenHash),
    uniqueIndex("app_installations_live_idx")
      .on(table.appId, table.storeId)
      .where(sql`revoked_at IS NULL`),
  ]
);

export type AppInstallation = typeof appInstallations.$inferSelect;
export type NewAppInstallation = typeof appInstallations.$inferInsert;
