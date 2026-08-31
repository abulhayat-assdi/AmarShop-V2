import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { parseScopes, SCOPE_LABEL_KEYS } from "@/lib/api/scopes";
import { getOAuthAppByClientId, redirectUriAllowed } from "@/lib/oauth/apps";
import { decideAuthorization } from "./actions";

type RawSearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      {children}
    </main>
  );
}

// Consent screen for the OAuth app-install flow. Renders a plain error
// (never a redirect) until the redirect_uri is confirmed against the
// app's allowlist — an unvalidated redirect_uri must not be bounced to.
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const { t } = await getTranslator();

  const clientId = one(sp.client_id);
  const redirectUri = one(sp.redirect_uri);
  const responseType = one(sp.response_type);
  const rawScope = one(sp.scope);
  const state = one(sp.state);
  const codeChallenge = one(sp.code_challenge);
  const codeChallengeMethod = one(sp.code_challenge_method);

  // 1. Must be signed in — bounce through login and back.
  const session = await auth();
  if (!session?.user) {
    const qs = new URLSearchParams();
    for (const k of [
      "client_id",
      "redirect_uri",
      "response_type",
      "scope",
      "state",
      "code_challenge",
      "code_challenge_method",
    ]) {
      const v = one(sp[k]);
      if (v) qs.set(k, v);
    }
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${qs.toString()}`)}`);
  }

  const errorView = (message: string) => (
    <Shell>
      <h1 className="text-xl font-semibold">{t("oauth.consent.errTitle")}</h1>
      <p className="text-sm text-gray-600">{message}</p>
      <Link href="/dashboard" className="text-sm underline">
        {t("oauth.consent.backToAdmin")}
      </Link>
    </Shell>
  );

  // 2. Only owner / admin may install an app.
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return errorView(t("oauth.consent.errRole"));
  }

  // 3. Validate the request. Anything wrong here → error page, no redirect.
  const app = clientId ? await getOAuthAppByClientId(clientId) : null;
  if (!app || app.status !== "active") return errorView(t("oauth.consent.errClient"));
  if (responseType !== "code") return errorView(t("oauth.consent.errResponseType"));
  if (!redirectUri || !redirectUriAllowed(app, redirectUri)) {
    return errorView(t("oauth.consent.errRedirect"));
  }
  if (
    codeChallenge &&
    codeChallengeMethod &&
    codeChallengeMethod !== "S256" &&
    codeChallengeMethod !== "plain"
  ) {
    return errorView(t("oauth.consent.errPkce"));
  }

  const appMax = parseScopes(app.scopes);
  const requested = rawScope ? parseScopes(rawScope.split(/[\s,]+/)) : [];
  const granted = (requested.length ? requested.filter((s) => appMax.includes(s)) : appMax);
  if (granted.length === 0) return errorView(t("oauth.consent.errScope"));

  const [store] = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);

  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {app.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.logoUrl}
              alt=""
              className="h-12 w-12 rounded border border-gray-200 object-cover"
            />
          )}
          <h1 className="text-xl font-semibold">
            {t("oauth.consent.heading", { app: app.name })}
          </h1>
        </div>
        <p className="text-sm text-gray-600">
          {t("oauth.consent.subheading", {
            app: app.name,
            store: store?.name ?? session.user.storeId,
          })}
        </p>
        {app.homepageUrl && (
          <p className="text-xs text-gray-500">
            {t("oauth.consent.developer", { name: app.developerName })} ·{" "}
            <a
              href={app.homepageUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="underline"
            >
              {app.homepageUrl}
            </a>
          </p>
        )}
      </div>

      <div className="rounded border p-4">
        <p className="text-sm font-medium">{t("oauth.consent.willBeAbleTo")}</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-700">
          {granted.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <span aria-hidden>•</span>
              <span>
                {t(SCOPE_LABEL_KEYS[s])}{" "}
                <span className="font-mono text-xs text-gray-400">{s}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <form action={decideAuthorization} className="flex flex-col gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="scope" value={granted.join(" ")} />
        <input type="hidden" name="state" value={state} />
        <input type="hidden" name="code_challenge" value={codeChallenge} />
        <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />

        <div className="flex gap-3">
          <button
            type="submit"
            name="decision"
            value="approve"
            className="flex-1 rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            {t("oauth.consent.authorize")}
          </button>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            {t("oauth.consent.cancel")}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {t("oauth.consent.redirectNote", { uri: redirectUri })}
        </p>
      </form>
    </Shell>
  );
}
