import { eq, or } from "drizzle-orm";
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

// The single place a store gets resolved from a raw Host header — by
// subdomain slug ({slug}.amarshop.com) or by a merchant's own custom
// domain. Called once, from proxy.ts. Everything downstream reads the
// result off request context (see ./current.ts) instead of re-deriving it.
export async function resolveStoreForHost(host: string): Promise<Store | null> {
  const slug = extractSlug(host);
  const conditions = slug ? [eq(stores.slug, slug), eq(stores.customDomain, host)] : [eq(stores.customDomain, host)];

  const [store] = await db
    .select()
    .from(stores)
    .where(or(...conditions))
    .limit(1);

  return store ?? null;
}
