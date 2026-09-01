import type { Metadata } from "next";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { BRAND_NAME } from "@/lib/marketing/constants";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Faq, ClosingCta } from "@/components/marketing/sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return {
    title: `${t("marketing.pricing.hero.title")} — ${BRAND_NAME}`,
    description: t("marketing.pricing.hero.subtitle", { days: TRIAL_DAYS }),
  };
}

export default async function PricingPage() {
  const { t } = await getMarketingTranslator();

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
        <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
          {t("marketing.pricing.hero.kicker")}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.pricing.hero.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          {t("marketing.pricing.hero.subtitle", { days: TRIAL_DAYS })}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8">
        <PricingSection showIncludes />
      </section>

      <Faq t={t} />
      <ClosingCta t={t} />
    </>
  );
}
