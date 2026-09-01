import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { LocaleToggle } from "@/components/locale-toggle";
import { BRAND_NAME, MARKETING_NAV } from "@/lib/marketing/constants";

// Shared, identical header/footer for every marketing page
// (SITE_STRUCTURE.md Part A: "build them once, not per-page"). Plain,
// data-in server components — the (marketing) layout renders them for
// /features, /pricing, /signup, and the no-store branch of
// src/app/page.tsx renders them for the homepage (which can't sit inside
// the route group's layout — same split the storefront chrome uses).
// <LocaleToggle> is a client component; both callers wrap this subtree in
// <I18nProvider> so it resolves.

export function MarketingHeader({ t, locale }: { t: Translator; locale: Locale }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {MARKETING_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-gray-600 hover:text-black">
              {t(`marketing.nav.${item.key}`)}
            </Link>
          ))}
          <LocaleToggle current={locale} />
          <Link href="/login" className="text-gray-600 hover:text-black">
            {t("marketing.nav.signIn")}
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-black px-3 py-1.5 font-medium text-white hover:bg-gray-800"
          >
            {t("marketing.nav.startTrial")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter({ t }: { t: Translator }) {
  return (
    <footer className="mt-20 border-t border-gray-200 bg-gray-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span className="text-base font-semibold">{BRAND_NAME}</span>
          <p className="max-w-xs text-sm text-gray-500">{t("marketing.footer.tagline")}</p>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-gray-900">{t("marketing.footer.colProduct")}</span>
          <Link href="/features" className="text-gray-500 hover:text-black">
            {t("marketing.footer.linkFeatures")}
          </Link>
          <Link href="/pricing" className="text-gray-500 hover:text-black">
            {t("marketing.footer.linkPricing")}
          </Link>
        </nav>
        <nav className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-gray-900">{t("marketing.footer.colCompany")}</span>
          <Link href="/about" className="text-gray-500 hover:text-black">
            {t("marketing.footer.linkAbout")}
          </Link>
          <Link href="/faq" className="text-gray-500 hover:text-black">
            {t("marketing.footer.linkFaq")}
          </Link>
          <Link href="/login" className="text-gray-500 hover:text-black">
            {t("marketing.footer.linkSignIn")}
          </Link>
          <Link href="/signup" className="text-gray-500 hover:text-black">
            {t("marketing.footer.linkStartTrial")}
          </Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-10 text-xs text-gray-400">
        <span>{t("marketing.footer.copyright", { year: new Date().getFullYear(), brand: BRAND_NAME })}</span>
        <span>{t("marketing.footer.madeIn")}</span>
      </div>
    </footer>
  );
}
