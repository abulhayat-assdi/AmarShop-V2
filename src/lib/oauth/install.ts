import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { appInstallations, oauthApps } from "@/db/schema";
import { hashToken } from "@/lib/api/keys";
import { parseScopes, type ApiScope } from "@/lib/api/scopes";

// A merchant's installed OAuth apps + the per-store access tokens they
// carry. app_installations sits outside the RLS boundary (see
// src/db/schema/app-installations.ts) — every function here scopes with an
// explicit `where store_id = ?`, except resolveInstallationToken() which
// IS the pre-store-context Bearer lookup (mirrors resolveApiKey()).

const TOKEN_PREFIX_LEN = 12; // "ato_" + 8 chars

export function mintInstallToken(): { token: string; prefix: string; hash: string } {
  const token = `ato_${randomBytes(24).toString("base64url")}`;
  return { token, prefix: token.slice(0, TOKEN_PREFIX_LEN), hash: hashToken(token) };
}

export type ResolvedInstallToken = { storeId: string; keyId: string; scopes: ApiScope[] };

const LAST_USED_THROTTLE_MS = 60_000;

// Given a raw `ato_…` Bearer token, return its store + granted scopes, or
// null if unknown / revoked / the parent app was disabled. Bumps
// token_last_used_at at most once a minute (fire-and-forget). The `keyId`
// is the installation id — used only as the /api/v1 rate-limit bucket.
export async function resolveInstallationToken(token: string): Promise<ResolvedInstallToken | null> {
  if (!token.startsWith("ato_")) return null;
  const [row] = await db
    .select({
      id: appInstallations.id,
      storeId: appInstallations.storeId,
      scopes: appInstallations.scopes,
      revokedAt: appInstallations.revokedAt,
      lastUsedAt: appInstallations.tokenLastUsedAt,
      appStatus: oauthApps.status,
    })
    .from(appInstallations)
    .innerJoin(oauthApps, eq(oauthApps.id, appInstallations.appId))
    .where(eq(appInstallations.tokenHash, hashToken(token)))
    .limit(1);
  if (!row || row.revokedAt || row.appStatus !== "active") return null;

  const now = Date.now();
  if (!row.lastUsedAt || now - row.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    void db
      .update(appInstallations)
      .set({ tokenLastUsedAt: new Date(now) })
      .where(eq(appInstallations.id, row.id))
      .catch((err) => console.warn("[oauth] token_last_used_at bump failed", err));
  }

  return { storeId: row.storeId, keyId: row.id, scopes: parseScopes(row.scopes) };
}

export type InstalledAppRow = {
  id: string;
  appName: string;
  appSlug: string;
  developerName: string;
  homepageUrl: string | null;
  logoUrl: string | null;
  appStatus: "active" | "disabled";
  scopes: ApiScope[];
  tokenPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export async function listInstallations(storeId: string): Promise<InstalledAppRow[]> {
  const rows = await db
    .select({
      id: appInstallations.id,
      appName: oauthApps.name,
      appSlug: oauthApps.slug,
      developerName: oauthApps.developerName,
      homepageUrl: oauthApps.homepageUrl,
      logoUrl: oauthApps.logoUrl,
      appStatus: oauthApps.status,
      scopes: appInstallations.scopes,
      tokenPrefix: appInstallations.tokenPrefix,
      lastUsedAt: appInstallations.tokenLastUsedAt,
      createdAt: appInstallations.createdAt,
    })
    .from(appInstallations)
    .innerJoin(oauthApps, eq(oauthApps.id, appInstallations.appId))
    .where(and(eq(appInstallations.storeId, storeId), isNull(appInstallations.revokedAt)))
    .orderBy(desc(appInstallations.createdAt));
  return rows.map((r) => ({ ...r, scopes: parseScopes(r.scopes) }));
}

// Merchant-initiated uninstall — revokes the installation's access token
// immediately. Scoped by storeId so one merchant can't revoke another's.
export async function uninstallApp(storeId: string, installationId: string): Promise<void> {
  await db
    .update(appInstallations)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(appInstallations.id, installationId),
        eq(appInstallations.storeId, storeId),
        isNull(appInstallations.revokedAt)
      )
    );
}

// Platform-initiated: kill every live installation of an app (called when
// a platform admin disables it). Not store-scoped — that's the point.
export async function revokeInstallationsForApp(appId: string): Promise<void> {
  await db
    .update(appInstallations)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(appInstallations.appId, appId), isNull(appInstallations.revokedAt)));
}
