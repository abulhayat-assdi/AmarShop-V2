import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveInstallationToken } from "@/lib/oauth/install";
import { resolveApiKey } from "./keys";
import type { ApiScope } from "./scopes";

// Shared helpers for /api/v1 route handlers: a consistent JSON envelope,
// Bearer-key auth with a per-key rate limit and scope check, and paging.

export type ApiContext = { storeId: string; keyId: string; scopes: ApiScope[] };

// A /api/v1 caller presents one of two credential kinds, both resolving to
// the same { storeId, keyId, scopes }: a merchant-minted API key ("ak_…",
// src/lib/api/keys.ts) or an OAuth app-installation token ("ato_…",
// src/lib/oauth). `keyId` is the per-credential rate-limit bucket.
async function resolveCredential(token: string): Promise<ApiContext | null> {
  if (token.startsWith("ato_")) return resolveInstallationToken(token);
  return resolveApiKey(token);
}

export function jsonOk(data: unknown, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ data, ...extra });
}

export function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

const RATE_LIMIT = { limit: 120, windowSeconds: 60 };

export async function authenticateApi(
  req: Request,
  requiredScope: ApiScope
): Promise<ApiContext | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return jsonError(401, "unauthorized", "Provide an API key as `Authorization: Bearer <key>`.");
  }

  const resolved = await resolveCredential(match[1].trim());
  if (!resolved) {
    return jsonError(401, "invalid_key", "That API key is not valid or has been revoked.");
  }

  const rl = await checkRateLimit(`apikey:${resolved.keyId}`, RATE_LIMIT);
  if (!rl.ok) {
    const res = jsonError(429, "rate_limited", "Too many requests — slow down.");
    res.headers.set("Retry-After", String(rl.retryAfter));
    return res;
  }

  if (!resolved.scopes.includes(requiredScope)) {
    return jsonError(
      403,
      "insufficient_scope",
      `This key is missing the \`${requiredScope}\` scope.`
    );
  }

  return resolved;
}

export type PageParams = { page: number; limit: number; offset: number };

export function readPage(url: string): PageParams {
  const sp = new URL(url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 25));
  return { page, limit, offset: (page - 1) * limit };
}
