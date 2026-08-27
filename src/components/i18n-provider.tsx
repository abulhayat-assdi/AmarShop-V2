"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";

type I18nValue = { locale: Locale; t: Translator };

const I18nContext = createContext<I18nValue | null>(null);

// `messages` is the plain object from messagesFor() — passed from a Server
// Component so client components under here can translate. Providers nest;
// the nearest one wins (the storefront re-provides with store.locale).
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: unknown;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createTranslator(messages) }),
    [locale, messages]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslator(): Translator {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslator must be used within <I18nProvider>");
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale must be used within <I18nProvider>");
  return ctx.locale;
}
