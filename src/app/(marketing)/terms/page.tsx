import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/marketing/constants";
import { TERMS_MARKDOWN, LEGAL_LAST_UPDATED } from "@/lib/marketing/legal";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { renderMarkdown } from "@/lib/cms/render";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return { title: `${t("marketing.legal.termsTitle")} — ${BRAND_NAME}` };
}

export default async function TermsPage() {
  const { t, locale } = await getMarketingTranslator();
  const html = renderMarkdown(TERMS_MARKDOWN[locale]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{t("marketing.legal.termsTitle")}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {t("marketing.legal.lastUpdated", { date: LEGAL_LAST_UPDATED })}
      </p>
      <div className="cms-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
