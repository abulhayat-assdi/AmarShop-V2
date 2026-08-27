import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { messagesFor, type Messages } from "./messages";
import { createTranslator, type Translator } from "./translate";

// Server-only (next/headers). Precedence: an explicit visitor cookie wins;
// otherwise the merchant's store.locale (storefront callers pass it); then
// the market default.
export async function resolveLocale(storeLocale?: string | null): Promise<Locale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;
  if (isLocale(storeLocale)) return storeLocale;
  return DEFAULT_LOCALE;
}

// For Server Components: `const { locale, t } = await getTranslator(store.locale)`.
export async function getTranslator(
  storeLocale?: string | null
): Promise<{ locale: Locale; messages: Messages; t: Translator }> {
  const locale = await resolveLocale(storeLocale);
  const messages = messagesFor(locale);
  return { locale, messages, t: createTranslator(messages) };
}
