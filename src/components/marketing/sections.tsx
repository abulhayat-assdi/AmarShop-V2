import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { BRAND_NAME, LAUNCH_MINUTES } from "@/lib/marketing/constants";

// Static (server-rendered) sections of the marketing homepage
// (SITE_STRUCTURE.md Part A "Homepage"). The interactive sections — the
// feature showcase and the pricing grid — are their own client components
// (feature-tabs.tsx, pricing-section.tsx). Sections that need real data
// the platform doesn't have yet (stats bar, trusted-merchant marquee,
// testimonials with counts) are deliberately omitted rather than faked —
// CLAUDE.md rule #8.

export function Hero({ t }: { t: Translator }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
      <div className="flex flex-col gap-6">
        <span className="w-fit rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
          {t("marketing.home.hero.kicker")}
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("marketing.home.hero.title")}
        </h1>
        <p className="text-lg text-gray-600">{t("marketing.home.hero.subtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-black px-5 py-2.5 font-medium text-white hover:bg-gray-800"
          >
            {t("marketing.home.hero.ctaPrimary")}
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-gray-300 px-5 py-2.5 font-medium hover:border-gray-400"
          >
            {t("marketing.home.hero.ctaSecondary")}
          </Link>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
          {["trust1", "trust2", "trust3", "trust4"].map((k) => (
            <li key={k}>✓ {t(`marketing.home.hero.${k}`)}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-1.5 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        </div>
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-400">
          {t("marketing.home.hero.mockLabel")}
        </div>
      </div>
    </section>
  );
}

export function ProblemSolution({ t }: { t: Translator }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-center text-2xl font-semibold sm:text-3xl">
        {t("marketing.home.problem.title")}
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-500">{t("marketing.home.problem.socialTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-500">
            {["social1", "social2", "social3", "social4"].map((k) => (
              <li key={k}>✗ {t(`marketing.home.problem.${k}`)}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-black p-6">
          <h3 className="font-semibold">
            {t("marketing.home.problem.withTitle", { brand: BRAND_NAME })}
          </h3>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-700">
            {["with1", "with2", "with3", "with4"].map((k) => (
              <li key={k}>✓ {t(`marketing.home.problem.${k}`)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ t }: { t: Translator }) {
  const steps = [
    { n: 1, title: "step1Title", desc: "step1Desc" },
    { n: 2, title: "step2Title", desc: "step2Desc" },
    { n: 3, title: "step3Title", desc: "step3Desc" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-center text-2xl font-semibold sm:text-3xl">{t("marketing.home.how.title")}</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              {s.n}
            </span>
            <h3 className="font-semibold">{t(`marketing.home.how.${s.title}`)}</h3>
            <p className="text-sm text-gray-600">
              {t(`marketing.home.how.${s.desc}`, { days: TRIAL_DAYS })}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">
        {t("marketing.home.how.launchNote", { minutes: LAUNCH_MINUTES })}
      </p>
    </section>
  );
}

export function DeveloperTeaser({ t }: { t: Translator }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8">
        <h2 className="text-xl font-semibold">
          {t("marketing.home.dev.title", { brand: BRAND_NAME })}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">{t("marketing.home.dev.desc")}</p>
        <p className="mt-2 text-xs text-gray-400">{t("marketing.home.dev.note")}</p>
      </div>
    </section>
  );
}

// `limit` caps how many of the marketing.home.faq.q1..qN pairs to show —
// the homepage teaser passes a small number, the dedicated /faq page shows
// them all. One question bank, no duplicated copy (rule #4).
export function Faq({
  t,
  limit = 12,
  showHeading = true,
}: {
  t: Translator;
  limit?: number;
  showHeading?: boolean;
}) {
  const items = Array.from({ length: limit }, (_, i) => i + 1);
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      {showHeading && (
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          {t("marketing.home.faq.title")}
        </h2>
      )}
      <div className="mt-10 flex flex-col divide-y divide-gray-200 border-y border-gray-200">
        {items.map((n) => (
          <details key={n} className="group py-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium marker:content-none">
              {t(`marketing.home.faq.q${n}`)}
              <span className="ml-4 text-gray-400 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-2 text-sm text-gray-600">
              {t(`marketing.home.faq.a${n}`, { days: TRIAL_DAYS, brand: BRAND_NAME })}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ClosingCta({ t }: { t: Translator }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-black px-6 py-14 text-center text-white">
        <h2 className="text-2xl font-semibold sm:text-3xl">{t("marketing.home.closing.title")}</h2>
        <p className="max-w-xl text-sm text-gray-300">
          {t("marketing.home.closing.subtitle", { days: TRIAL_DAYS })}
        </p>
        <Link
          href="/signup"
          className="rounded-md bg-white px-5 py-2.5 font-medium text-black hover:bg-gray-200"
        >
          {t("marketing.home.closing.cta")}
        </Link>
      </div>
    </section>
  );
}
