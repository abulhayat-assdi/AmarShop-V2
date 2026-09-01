// Client-safe helpers shared by the admin form, the mutation layer and
// the proxy lookup. No server imports.

export const REDIRECT_STATUS_CODES = [301, 302] as const;
export type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number];

export function isRedirectStatusCode(n: number): n is RedirectStatusCode {
  return (REDIRECT_STATUS_CODES as readonly number[]).includes(n);
}

// Normalise a source pathname to the exact form stored + matched against:
// a single leading slash, no trailing slash (except root "/"), no query
// string or fragment, no whitespace, no scheme. Returns null if the input
// can't be a local pathname.
export function normalizePath(input: string): string | null {
  let p = input.trim();
  if (p === "") return null;
  if (/\s/.test(p) || p.includes("://")) return null;
  p = p.split(/[?#]/)[0];
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

// A redirect target is either an absolute http(s) URL or a site-relative
// path we can normalise.
export function isAbsoluteUrl(input: string): boolean {
  return /^https?:\/\/\S+$/i.test(input.trim());
}

export function isValidTarget(input: string): boolean {
  const v = input.trim();
  return isAbsoluteUrl(v) || normalizePath(v) !== null;
}

// The value to store for `toTarget`: absolute URLs kept verbatim, paths
// normalised.
export function canonicalTarget(input: string): string | null {
  const v = input.trim();
  if (isAbsoluteUrl(v)) return v;
  return normalizePath(v);
}
