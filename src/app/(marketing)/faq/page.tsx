import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/marketing/constants";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { Faq, ClosingCta } from "@/components/marketing/sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return {
    title: `${t("marketing.faqPage.title")} — ${BRAND_NAME}`,
    description: t("marketing.faqPage.subtitle"),
  };
}

export default async function FaqPage() {
  const { t } = await getMarketingTranslator();

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
        <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
          {t("marketing.faqPage.kicker")}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.faqPage.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">{t("marketing.faqPage.subtitle")}</p>
      </section>

      <Faq t={t} showHeading={false} />
      <ClosingCta t={t} />
    </>
  );
}
