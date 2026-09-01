import { resolveLocale } from "./server";
import { messagesFor } from "./messages";
import { marketingMessages } from "./messages/marketing";
import { createTranslator, type Translator } from "./translate";
import type { Locale } from "./config";

// Server-only translator for the public marketing site. Same locale
// precedence as getTranslator() (visitor cookie → market default; the
// marketing site has no store.locale), but it also merges the standalone
// marketing copy in under `marketing.*` so pages can call
// t("marketing.home.hero.title") alongside the shared keys (e.g.
// "billing.plan.free", reused by the pricing cards).
//
// The returned `messages` is the merged object — pass it straight to
// <I18nProvider> so client components under the marketing tree
// (LocaleToggle, the pricing toggle, the feature tabs) resolve both
// namespaces too.
export async function getMarketingTranslator(): Promise<{
  locale: Locale;
  messages: Record<string, unknown>;
  t: Translator;
}> {
  const locale = await resolveLocale();
  const messages = {
    ...messagesFor(locale),
    marketing: marketingMessages[locale],
  };
  return { locale, messages, t: createTranslator(messages) };
}
