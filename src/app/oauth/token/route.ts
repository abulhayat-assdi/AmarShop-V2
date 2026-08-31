import { NextResponse } from "next/server";
import { exchangeAuthorizationCode, type OAuthTokenError } from "@/lib/oauth/flow";

// POST /oauth/token — the OAuth 2.0 token endpoint. Exchanges a one-time
// authorization code (from /oauth/authorize) for a store-scoped access
// token the app then sends as `Authorization: Bearer ato_…` on /api/v1.
//
// Accepts application/x-www-form-urlencoded (the spec default) or JSON.
// Client authentication: `client_id` + `client_secret` in the body, or
// HTTP Basic. Field names + the error envelope follow RFC 6749, so they
// use snake_case here rather than the /api/v1 { error: { code } } shape.

function tokenError(status: number, error: OAuthTokenError, description: string): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } }
  );
}

async function readParams(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (type.includes("application/json")) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(body ?? {})) {
        if (typeof v === "string") out[k] = v;
      }
    } catch {
      /* leave out empty — validated below */
    }
  } else {
    const text = await req.text();
    for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  }

  // HTTP Basic client auth (RFC 6749 §2.3.1) fills in what the body omits.
  const auth = req.headers.get("authorization") ?? "";
  const basic = /^Basic\s+(.+)$/i.exec(auth);
  if (basic) {
    try {
      const [id, secret] = Buffer.from(basic[1], "base64").toString("utf8").split(":");
      if (id && !out.client_id) out.client_id = decodeURIComponent(id);
      if (secret && !out.client_secret) out.client_secret = decodeURIComponent(secret);
    } catch {
      /* ignore malformed header */
    }
  }
  return out;
}

export async function POST(req: Request) {
  const p = await readParams(req);

  if (p.grant_type !== "authorization_code") {
    return tokenError(
      400,
      "unsupported_grant_type",
      "Only grant_type=authorization_code is supported."
    );
  }

  const result = await exchangeAuthorizationCode({
    code: p.code ?? "",
    clientId: p.client_id ?? "",
    clientSecret: p.client_secret ?? null,
    redirectUri: p.redirect_uri ?? "",
    codeVerifier: p.code_verifier ?? null,
  });

  if (!result.ok) return tokenError(result.status, result.error, result.message);

  return NextResponse.json(
    { access_token: result.accessToken, token_type: "Bearer", scope: result.scope },
    { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } }
  );
}
