import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { oauthApps } from "./oauth-apps";

// Short-lived (10 min), single-use authorization codes for the OAuth
// app-install flow. Issued by the /oauth/authorize consent action and
// redeemed once at POST /oauth/token for an access token.
//
// OUTSIDE the RLS boundary like `api_keys` / `oauth_apps`: the token
// exchange is an unauthenticated machine call (the client authenticates
// with its own secret, not a staff session), so the `WHERE code_hash = ?`
// lookup runs with no store context. Rows are consumed in place
// (`consumedAt`) and swept by TTL; access is only ever through
// src/lib/oauth/flow.ts. Not a rule #2 gap.
//
// Only the SHA-256 `codeHash` is stored. `codeChallenge` /
// `codeChallengeMethod` carry a PKCE (S256) challenge when the client
// sent one — optional, verified at exchange against the `code_verifier`.
export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => oauthApps.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scopes: text("scopes").notNull(),
    codeChallenge: text("code_challenge"),
    codeChallengeMethod: text("code_challenge_method"),
    // The staff member who approved the install — copied onto the
    // installation row at exchange (loose audit note, no FK).
    installedByStaffId: uuid("installed_by_staff_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("oauth_authorization_codes_code_hash_idx").on(table.codeHash)]
);

export type OAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferSelect;
export type NewOAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferInsert;
