import { randomBytes, timingSafeEqual } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { appInstallations, oauthApps, type OAuthApp } from "@/db/schema";
import { hashToken } from "@/lib/api/keys";
import { parseScopes, serializeScopes, type ApiScope } from "@/lib/api/scopes";
import { revokeInstallationsForApp } from "./install";

// The platform-global OAuth app registry (src/db/schema/oauth-apps.ts).
// Written only from /platform/apps by a platform admin; read by the
// /oauth/authorize consent screen and the /oauth/token exchange.

const SECRET_PREFIX_LEN = 11; // "cs_" + 8 chars

export function mintClientCredentials(): {
  clientId: string;
  secret: string;
  secretPrefix: string;
  secretHash: string;
} {
  const clientId = `cid_${randomBytes(16).toString("hex")}`;
  const secret = `cs_${randomBytes(24).toString("base64url")}`;
  return {
    clientId,
    secret,
    secretPrefix: secret.slice(0, SECRET_PREFIX_LEN),
    secretHash: hashToken(secret),
  };
}

// Constant-time check of a presented client_secret against the stored hash.
export function verifyClientSecret(app: Pick<OAuthApp, "clientSecretHash">, presented: string): boolean {
  const a = Buffer.from(hashToken(presented), "utf8");
  const b = Buffer.from(app.clientSecretHash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "app"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  const [clash] = await db.select({ id: oauthApps.id }).from(oauthApps).where(eq(oauthApps.slug, base)).limit(1);
  return clash ? `${base}-${randomBytes(3).toString("hex")}` : base;
}

// Parse the /platform/apps redirect-URI textarea into a clean list of
// absolute http(s) URLs with no fragment (RFC 6749 §3.1.2).
export function parseRedirectUris(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/[\r\n,]+/)) {
    const candidate = line.trim();
    if (!candidate) continue;
    try {
      const u = new URL(candidate);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (u.hash) continue;
      out.push(candidate);
    } catch {
      /* skip malformed */
    }
  }
  return [...new Set(out)];
}

// Exact string match, per the OAuth spec's redirect-URI guidance.
export function redirectUriAllowed(app: Pick<OAuthApp, "redirectUris">, candidate: string): boolean {
  return app.redirectUris
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(candidate);
}

export type OAuthAppInput = {
  name: string;
  developerName: string;
  developerEmail: string;
  homepageUrl: string | null;
  description: string | null;
  redirectUris: string[];
  scopes: ApiScope[];
};

function validate(input: OAuthAppInput): { scopes: ApiScope[] } {
  if (!input.name.trim()) throw new Error("oauth apps: name required");
  if (!input.developerName.trim()) throw new Error("oauth apps: developer name required");
  if (!input.developerEmail.trim()) throw new Error("oauth apps: developer email required");
  if (input.redirectUris.length === 0) throw new Error("oauth apps: at least one redirect URI required");
  const scopes = parseScopes(input.scopes);
  if (scopes.length === 0) throw new Error("oauth apps: at least one valid scope required");
  return { scopes };
}

export async function createOAuthApp(
  input: OAuthAppInput
): Promise<{ id: string; clientId: string; secret: string }> {
  const { scopes } = validate(input);
  const { clientId, secret, secretPrefix, secretHash } = mintClientCredentials();
  const slug = await uniqueSlug(slugify(input.name));

  const [row] = await db
    .insert(oauthApps)
    .values({
      name: input.name.trim(),
      slug,
      description: input.description,
      developerName: input.developerName.trim(),
      developerEmail: input.developerEmail.trim(),
      homepageUrl: input.homepageUrl,
      clientId,
      clientSecretHash: secretHash,
      clientSecretPrefix: secretPrefix,
      redirectUris: input.redirectUris.join("\n"),
      scopes: serializeScopes(scopes),
    })
    .returning({ id: oauthApps.id });

  return { id: row.id, clientId, secret };
}

export async function updateOAuthApp(id: string, input: OAuthAppInput): Promise<void> {
  const { scopes } = validate(input);
  await db
    .update(oauthApps)
    .set({
      name: input.name.trim(),
      description: input.description,
      developerName: input.developerName.trim(),
      developerEmail: input.developerEmail.trim(),
      homepageUrl: input.homepageUrl,
      redirectUris: input.redirectUris.join("\n"),
      scopes: serializeScopes(scopes),
      updatedAt: new Date(),
    })
    .where(eq(oauthApps.id, id));
}

export async function regenerateClientSecret(id: string): Promise<string> {
  const { secret, secretPrefix, secretHash } = mintClientCredentials();
  await db
    .update(oauthApps)
    .set({ clientSecretHash: secretHash, clientSecretPrefix: secretPrefix, updatedAt: new Date() })
    .where(eq(oauthApps.id, id));
  return secret;
}

export async function setOAuthAppStatus(id: string, status: "active" | "disabled"): Promise<void> {
  await db.update(oauthApps).set({ status, updatedAt: new Date() }).where(eq(oauthApps.id, id));
  // Disabling an app immediately cuts off every merchant that installed it.
  if (status === "disabled") await revokeInstallationsForApp(id);
}

export async function getOAuthApp(id: string): Promise<OAuthApp | null> {
  const [row] = await db.select().from(oauthApps).where(eq(oauthApps.id, id)).limit(1);
  return row ?? null;
}

export async function getOAuthAppByClientId(clientId: string): Promise<OAuthApp | null> {
  if (!clientId.startsWith("cid_")) return null;
  const [row] = await db.select().from(oauthApps).where(eq(oauthApps.clientId, clientId)).limit(1);
  return row ?? null;
}

export type OAuthAppListItem = {
  id: string;
  name: string;
  slug: string;
  developerName: string;
  developerEmail: string;
  homepageUrl: string | null;
  description: string | null;
  clientId: string;
  clientSecretPrefix: string;
  redirectUris: string[];
  scopes: ApiScope[];
  status: "active" | "disabled";
  installCount: number;
  createdAt: Date;
};

export async function listOAuthApps(): Promise<OAuthAppListItem[]> {
  const rows = await db
    .select({
      id: oauthApps.id,
      name: oauthApps.name,
      slug: oauthApps.slug,
      developerName: oauthApps.developerName,
      developerEmail: oauthApps.developerEmail,
      homepageUrl: oauthApps.homepageUrl,
      description: oauthApps.description,
      clientId: oauthApps.clientId,
      clientSecretPrefix: oauthApps.clientSecretPrefix,
      redirectUris: oauthApps.redirectUris,
      scopes: oauthApps.scopes,
      status: oauthApps.status,
      createdAt: oauthApps.createdAt,
      installCount: sql<number>`(
        select count(*)::int from ${appInstallations} ai
        where ai.app_id = ${oauthApps.id} and ai.revoked_at is null
      )`,
    })
    .from(oauthApps)
    .orderBy(desc(oauthApps.createdAt));

  return rows.map((r) => ({
    ...r,
    redirectUris: r.redirectUris.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean),
    scopes: parseScopes(r.scopes),
  }));
}
