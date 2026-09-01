import type { Metadata } from "next";
import { BRAND_NAME, COMPANY_LEGAL_NAME } from "@/lib/marketing/constants";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { ClosingCta } from "@/components/marketing/sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return {
    title: `${t("marketing.about.hero.title")} — ${BRAND_NAME}`,
    description: t("marketing.about.hero.body", { brand: BRAND_NAME }),
  };
}

export default async function AboutPage() {
  const { t } = await getMarketingTranslator();
  const values = ["v1", "v2", "v3", "v4"];

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
          {t("marketing.about.hero.kicker")}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.about.hero.title")}
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          {t("marketing.about.hero.body", { brand: BRAND_NAME })}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold">{t("marketing.about.valuesTitle")}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {values.map((v) => (
            <div key={v} className="rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold">{t(`marketing.about.values.${v}.title`)}</h3>
              <p className="mt-2 text-sm text-gray-600">{t(`marketing.about.values.${v}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-2xl font-semibold">{t("marketing.about.storyTitle")}</h2>
        <p className="mt-4 text-gray-600">
          {t("marketing.about.story.p1", { company: COMPANY_LEGAL_NAME })}
        </p>
        <p className="mt-3 text-gray-600">{t("marketing.about.story.p2")}</p>
      </section>

      <ClosingCta t={t} />
    </>
  );
}
