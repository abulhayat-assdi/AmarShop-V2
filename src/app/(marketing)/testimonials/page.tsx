import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/marketing/constants";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { getPublishedTestimonials } from "@/lib/testimonials/query";
import { TestimonialGrid } from "@/components/marketing/testimonials";
import { ClosingCta } from "@/components/marketing/sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return {
    title: `${t("marketing.testimonials.title", { brand: BRAND_NAME })} — ${BRAND_NAME}`,
    description: t("marketing.testimonials.subtitle"),
  };
}

export default async function TestimonialsPage() {
  const { t } = await getMarketingTranslator();
  const items = await getPublishedTestimonials();

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
        <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
          {t("marketing.testimonials.kicker")}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.testimonials.title", { brand: BRAND_NAME })}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          {t("marketing.testimonials.subtitle")}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8">
        {items.length === 0 ? (
          <p className="text-center text-gray-500">{t("marketing.testimonials.empty")}</p>
        ) : (
          <TestimonialGrid items={items} />
        )}
      </section>

      <ClosingCta t={t} />
    </>
  );
}
