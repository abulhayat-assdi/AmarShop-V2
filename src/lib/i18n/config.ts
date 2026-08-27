// Client-safe: no server-only imports. Both the client provider and the
// server helper build on this.

export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// Bengali default — the market's primary language (PROJECT_PLAN.md,
// SITE_STRUCTURE.md "Bengali default / English").
export const DEFAULT_LOCALE: Locale = "bn";

export const LOCALE_COOKIE = "amarshop_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
