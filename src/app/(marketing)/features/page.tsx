import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/marketing/constants";
import { FEATURE_CATEGORIES, FEATURE_COUNT } from "@/lib/marketing/features";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { ClosingCta } from "@/components/marketing/sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return {
    title: `${t("marketing.features.hero.title")} — ${BRAND_NAME}`,
    description: t("marketing.features.hero.subtitle", { count: FEATURE_COUNT }),
  };
}

export default async function FeaturesPage() {
  const { t } = await getMarketingTranslator();

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
        <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
          {t("marketing.features.hero.kicker")}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.features.hero.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          {t("marketing.features.hero.subtitle", { count: FEATURE_COUNT })}
        </p>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-8">
        {FEATURE_CATEGORIES.map((cat) => (
          <section key={cat.key} className="border-t border-gray-200 py-12 first:border-t-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-black" aria-hidden />
              <h2 className="text-xl font-semibold">{t(`marketing.features.categories.${cat.key}`)}</h2>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.items.map((item) => (
                <div key={item} className="rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold">
                    {t(`marketing.features.items.${item}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-600">
                    {t(`marketing.features.items.${item}.desc`)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <ClosingCta t={t} />
    </>
  );
}
