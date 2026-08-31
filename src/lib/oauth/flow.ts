import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { appInstallations, oauthApps, oauthAuthorizationCodes } from "@/db/schema";
import { hashToken } from "@/lib/api/keys";
import { parseScopes, serializeScopes, type ApiScope } from "@/lib/api/scopes";
import { verifyClientSecret } from "./apps";
import { mintInstallToken } from "./install";

// The OAuth 2.0 authorization-code flow for installing an app into a store.
// Confidential clients only: a client_secret is always required at the
// token exchange; PKCE (S256 or plain) is an optional extra layer,
// enforced when the authorize request carried a code_challenge.

const CODE_TTL_MS = 10 * 60_000;

export async function issueAuthorizationCode(input: {
  appId: string;
  storeId: string;
  staffId: string | null;
  redirectUri: string;
  scopes: ApiScope[];
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
}): Promise<string> {
  const code = `oac_${randomBytes(32).toString("base64url")}`;
  await db.insert(oauthAuthorizationCodes).values({
    appId: input.appId,
    storeId: input.storeId,
    codeHash: hashToken(code),
    redirectUri: input.redirectUri,
    scopes: serializeScopes(input.scopes),
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: input.codeChallenge ? input.codeChallengeMethod ?? "plain" : null,
    installedByStaffId: input.staffId,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

export type OAuthTokenError =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unsupported_grant_type";

export type ExchangeResult =
  | { ok: true; accessToken: string; scope: string }
  | { ok: false; error: OAuthTokenError; status: number; message: string };

function fail(error: OAuthTokenError, status: number, message: string): ExchangeResult {
  return { ok: false, error, status, message };
}

class CodeRace extends Error {}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  codeVerifier: string | null;
}): Promise<ExchangeResult> {
  if (!input.clientId) return fail("invalid_client", 401, "client_id is required.");
  if (!input.code) return fail("invalid_request", 400, "code is required.");
  if (!input.redirectUri) return fail("invalid_request", 400, "redirect_uri is required.");

  const [app] = await db.select().from(oauthApps).where(eq(oauthApps.clientId, input.clientId)).limit(1);
  if (!app || app.status !== "active") {
    return fail("invalid_client", 401, "Unknown or disabled client.");
  }
  if (!input.clientSecret || !verifyClientSecret(app, input.clientSecret)) {
    return fail("invalid_client", 401, "client_secret is missing or incorrect.");
  }

  const [row] = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.codeHash, hashToken(input.code)))
    .limit(1);
  if (
    !row ||
    row.consumedAt != null ||
    row.expiresAt.getTime() < Date.now() ||
    row.appId !== app.id ||
    row.redirectUri !== input.redirectUri
  ) {
    return fail("invalid_grant", 400, "The authorization code is invalid, expired, or already used.");
  }

  if (row.codeChallenge) {
    if (!input.codeVerifier) {
      return fail("invalid_grant", 400, "code_verifier is required for this authorization code.");
    }
    const computed =
      (row.codeChallengeMethod ?? "plain") === "S256"
        ? createHash("sha256").update(input.codeVerifier).digest("base64url")
        : input.codeVerifier;
    if (computed !== row.codeChallenge) {
      return fail("invalid_grant", 400, "PKCE verification failed.");
    }
  }

  const { token, prefix, hash } = mintInstallToken();
  try {
    await db.transaction(async (tx) => {
      const consumed = await tx
        .update(oauthAuthorizationCodes)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(oauthAuthorizationCodes.id, row.id),
            isNull(oauthAuthorizationCodes.consumedAt)
          )
        )
        .returning({ id: oauthAuthorizationCodes.id });
      if (consumed.length === 0) throw new CodeRace();

      // A re-install supersedes the previous grant for this (app, store).
      await tx
        .update(appInstallations)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(appInstallations.appId, row.appId),
            eq(appInstallations.storeId, row.storeId),
            isNull(appInstallations.revokedAt)
          )
        );

      await tx.insert(appInstallations).values({
        storeId: row.storeId,
        appId: row.appId,
        scopes: row.scopes,
        tokenHash: hash,
        tokenPrefix: prefix,
        installedByStaffId: row.installedByStaffId,
      });
    });
  } catch (err) {
    if (err instanceof CodeRace) {
      return fail("invalid_grant", 400, "The authorization code was already used.");
    }
    throw err;
  }

  return { ok: true, accessToken: token, scope: parseScopes(row.scopes).join(" ") };
}
