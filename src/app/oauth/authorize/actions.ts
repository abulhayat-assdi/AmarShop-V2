"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { parseScopes } from "@/lib/api/scopes";
import { getOAuthAppByClientId, redirectUriAllowed } from "@/lib/oauth/apps";
import { issueAuthorizationCode } from "@/lib/oauth/flow";

// The consent screen's Authorize / Cancel submit. Everything is
// re-validated here — the hidden form fields are never trusted on their
// own. On success we 303 to the app's redirect_uri with ?code=; on cancel
// or a scope problem, with ?error=. Param/redirect_uri validation that
// couldn't be trusted lives in the page (it renders an error, never a
// redirect); by the time we're here the redirect_uri is allowlisted.

function appendParams(redirectUri: string, params: Record<string, string>): string {
  const sep = redirectUri.includes("?") ? "&" : "?";
  const qs = Object.entries(params)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${redirectUri}${sep}${qs}`;
}

export async function decideAuthorization(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const canInstall = session.user.role === "owner" || session.user.role === "admin";
  if (!canInstall) throw new Error("Insufficient permissions");

  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "") || null;
  const codeChallengeMethod = String(formData.get("code_challenge_method") ?? "") || null;

  const app = await getOAuthAppByClientId(clientId);
  if (!app || app.status !== "active") throw new Error("Unknown or disabled client");
  if (!redirectUriAllowed(app, redirectUri)) throw new Error("redirect_uri not allowed for this client");

  if (decision !== "approve") {
    redirect(appendParams(redirectUri, { error: "access_denied", state }));
  }

  const granted = parseScopes(String(formData.get("scope") ?? "").split(/[\s,]+/)).filter((s) =>
    parseScopes(app.scopes).includes(s)
  );
  if (granted.length === 0) {
    redirect(appendParams(redirectUri, { error: "invalid_scope", state }));
  }

  const code = await issueAuthorizationCode({
    appId: app.id,
    storeId: session.user.storeId,
    staffId: session.user.id ?? null,
    redirectUri,
    scopes: granted,
    codeChallenge,
    codeChallengeMethod,
  });

  redirect(appendParams(redirectUri, { code, state }));
}
