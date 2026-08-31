import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { oauthAppStatusEnum } from "./enums";

// Platform-global registry of third-party OAuth apps — the developer
// platform (Phase 6). A merchant installs an app through the
// /oauth/authorize consent flow, which mints a per-store access token
// (see app_installations); the app then calls /api/v1 with that token.
//
// DELIBERATELY OUTSIDE the app.current_store_id RLS boundary, exactly like
// `stores` and `api_keys` (see src/db/context.ts): an app is not
// tenant-scoped (one app installs into many stores), and the
// /oauth/token exchange resolves the app by `client_id` BEFORE any store
// context exists. Written only from /platform/apps by a platform admin —
// the merchant side never touches this table. Not a rule #2 gap.
//
// Only the SHA-256 `clientSecretHash` is stored; the plaintext secret is
// shown once, at creation and on regenerate. `clientId` is public (it
// travels in the authorize URL). `redirectUris` is a newline-joined
// exact-match allowlist. `scopes` is the comma-joined maximum a token for
// this app may be granted, validated on write against src/lib/api/scopes.ts.
export const oauthApps = pgTable(
  "oauth_apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    developerName: text("developer_name").notNull(),
    developerEmail: text("developer_email").notNull(),
    homepageUrl: text("homepage_url"),
    logoUrl: text("logo_url"),
    clientId: text("client_id").notNull(),
    clientSecretHash: text("client_secret_hash").notNull(),
    clientSecretPrefix: text("client_secret_prefix").notNull(),
    redirectUris: text("redirect_uris").notNull(),
    scopes: text("scopes").notNull(),
    status: oauthAppStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("oauth_apps_slug_idx").on(table.slug),
    uniqueIndex("oauth_apps_client_id_idx").on(table.clientId),
  ]
);

export type OAuthApp = typeof oauthApps.$inferSelect;
export type NewOAuthApp = typeof oauthApps.$inferInsert;
