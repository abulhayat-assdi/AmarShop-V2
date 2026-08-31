import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { parseScopes, serializeScopes, type ApiScope } from "./scopes";

// Per-store public-API credentials. api_keys sits outside the RLS boundary
// (see src/db/schema/api-keys.ts) — every function here scopes with an
// explicit `where store_id = ?`, except resolveApiKey() which IS the
// pre-store-context lookup.

const TOKEN_PREFIX_LEN = 11; // "ak_" + 8 chars

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintApiKey(): { token: string; prefix: string; hash: string } {
  const token = `ak_${randomBytes(24).toString("base64url")}`;
  return { token, prefix: token.slice(0, TOKEN_PREFIX_LEN), hash: hashToken(token) };
}

export type CreatedApiKey = { id: string; token: string; prefix: string };

export async function createApiKey(
  storeId: string,
  input: { name: string; scopes: ApiScope[]; staffId: string | null }
): Promise<CreatedApiKey> {
  const name = input.name.trim();
  if (!name) throw new Error("name required");
  const scopes = parseScopes(input.scopes);
  if (scopes.length === 0) throw new Error("at least one valid scope required");

  const { token, prefix, hash } = mintApiKey();
  const [row] = await db
    .insert(apiKeys)
    .values({
      storeId,
      name,
      tokenHash: hash,
      tokenPrefix: prefix,
      scopes: serializeScopes(scopes),
      createdByStaffId: input.staffId,
    })
    .returning({ id: apiKeys.id });

  return { id: row.id, token, prefix };
}

export type ApiKeyListItem = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: ApiScope[];
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export async function listApiKeys(storeId: string): Promise<ApiKeyListItem[]> {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      tokenPrefix: apiKeys.tokenPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.storeId, storeId))
    .orderBy(desc(apiKeys.createdAt));
  return rows.map((r) => ({ ...r, scopes: parseScopes(r.scopes) }));
}

export async function revokeApiKey(storeId: string, id: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.storeId, storeId), isNull(apiKeys.revokedAt)));
}

export type ResolvedApiKey = { storeId: string; keyId: string; scopes: ApiScope[] };

const LAST_USED_THROTTLE_MS = 60_000;

// The pre-store-context lookup: given a raw Bearer token, return its store
// + scopes, or null if unknown / revoked. Bumps last_used_at at most once
// a minute (fire-and-forget) so a busy integration doesn't write per call.
export async function resolveApiKey(token: string): Promise<ResolvedApiKey | null> {
  if (!token.startsWith("ak_")) return null;
  const [row] = await db
    .select({
      id: apiKeys.id,
      storeId: apiKeys.storeId,
      scopes: apiKeys.scopes,
      revokedAt: apiKeys.revokedAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, hashToken(token)))
    .limit(1);
  if (!row || row.revokedAt) return null;

  const now = Date.now();
  if (!row.lastUsedAt || now - row.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    void db
      .update(apiKeys)
      .set({ lastUsedAt: new Date(now) })
      .where(eq(apiKeys.id, row.id))
      .catch((err) => console.warn("[api] last_used_at bump failed", err));
  }

  return { storeId: row.storeId, keyId: row.id, scopes: parseScopes(row.scopes) };
}
