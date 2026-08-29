"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { setLocaleCookie } from "@/lib/i18n/client";
import { useTranslator } from "@/components/i18n-provider";

const NATIVE_LABEL: Record<Locale, string> = { bn: "বাংলা", en: "English" };

// Globe pill. Writes the non-httpOnly locale cookie directly (not
// sensitive) and refreshes so every Server Component re-renders in the new
// language. Persists across navigation via the cookie.
export function LocaleToggle({ current }: { current: Locale }) {
  const router = useRouter();
  const t = useTranslator();
  const [isPending, startTransition] = useTransition();

  function pick(locale: Locale) {
    if (locale === current) return;
    setLocaleCookie(locale);
    startTransition(() => router.refresh());
  }

  return (
    <span
      className={`inline-flex items-center overflow-hidden rounded-full border text-xs ${
        isPending ? "opacity-50" : ""
      }`}
      aria-label={t("common.language")}
    >
      <span aria-hidden className="px-2">
        🌐
      </span>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => pick(locale)}
          aria-pressed={locale === current}
          className={`px-2 py-1 ${
            locale === current ? "bg-black text-white" : "hover:bg-gray-100"
          }`}
        >
          {NATIVE_LABEL[locale]}
        </button>
      ))}
    </span>
  );
}
