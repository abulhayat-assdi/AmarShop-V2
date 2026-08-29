import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { stores, type Store } from "@/db/schema";

// The platform's own admin/marketing surfaces (app.amarshop.com,
// www.amarshop.com, and the bare root domain) are never a merchant
// storefront — they skip tenant resolution entirely.
export function isPlatformHost(host: string): boolean {
  const rootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  if (!rootDomain) return false;
  return host === rootDomain || host === `www.${rootDomain}` || host === `app.${rootDomain}`;
}

function extractSlug(host: string): string | null {
  const rootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  if (!rootDomain) return null;
  const suffix = `.${rootDomain}`;
  if (!host.endsWith(suffix)) return null;
  const sub = host.slice(0, -suffix.length);
  return sub && sub !== "www" && sub !== "app" ? sub : null;
}

function wwwSibling(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : `www.${host}`;
}

export type HostResolution = { store: Store; canonicalHost: string };

// The single place a store gets resolved from a raw Host header — by
// subdomain slug ({slug}.amarshop.com) or by a merchant's own custom
// domain. Called once, from proxy.ts. Everything downstream reads the
// result off request context (see ./current.ts) instead of re-deriving it.
//
// A custom domain only resolves once custom_domain_verified_at is set (the
// merchant ran the DNS check in admin) — an unverified domain 404s, so a
// half-configured domain never serves and the Caddy /ask endpoint stays
// consistent with what actually resolves here.
//
// canonicalHost is what the storefront should be served on: for a custom
// domain, the exact value the merchant saved — so a request arriving on
// the www<->apex sibling (which also resolves here, so its TLS cert gets
// issued) is 308-redirected to it by proxy.ts.
export async function resolveHost(host: string): Promise<HostResolution | null> {
  const slug = extractSlug(host);
  if (slug) {
    const [store] = await db.select().from(stores).where(eq(stores.slug, slug)).limit(1);
    return store ? { store, canonicalHost: host } : null;
  }

  const verified = isNotNull(stores.customDomainVerifiedAt);
  const [exact] = await db
    .select()
    .from(stores)
    .where(and(verified, eq(stores.customDomain, host)))
    .limit(1);
  const store =
    exact ??
    (
      await db
        .select()
        .from(stores)
        .where(and(verified, eq(stores.customDomain, wwwSibling(host))))
        .limit(1)
    )[0];

  return store?.customDomain ? { store, canonicalHost: store.customDomain } : null;
}

// Yes/no wrapper for the Caddy /ask endpoint — resolves both the canonical
// custom domain and its www sibling, so on-demand TLS covers both.
export async function resolveStoreForHost(host: string): Promise<Store | null> {
  return (await resolveHost(host))?.store ?? null;
}

// The host a merchant should point their custom-domain CNAME at:
// {slug}.{PLATFORM_ROOT_DOMAIN}. Single source of truth for the value the
// admin page shows and the verify action checks against. null when
// PLATFORM_ROOT_DOMAIN isn't configured.
export function slugHostFor(store: Pick<Store, "slug">): string | null {
  const rootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  return rootDomain ? `${store.slug}.${rootDomain}` : null;
}

// The public URL of a store's storefront — for the admin's "View Store"
// link. custom domain if set, else {slug}.{PLATFORM_ROOT_DOMAIN}. Returns
// null when PLATFORM_ROOT_DOMAIN isn't configured (and there's no custom
// domain), so the caller can hide the link.
export function storefrontUrlFor(store: Pick<Store, "slug" | "customDomain">): string | null {
  const scheme = process.env.NODE_ENV === "production" ? "https" : "http";
  if (store.customDomain) return `${scheme}://${store.customDomain}`;
  const rootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  if (!rootDomain) return null;
  return `${scheme}://${store.slug}.${rootDomain}`;
}
