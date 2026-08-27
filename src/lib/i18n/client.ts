import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";

// Browser-only. Writes the non-httpOnly locale cookie so the next server
// render picks up the choice. Kept out of the component body so the
// react-hooks/immutability rule doesn't flag the `document.cookie` assign.
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
