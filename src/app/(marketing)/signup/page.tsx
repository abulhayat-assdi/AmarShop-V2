import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/marketing/constants";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { SignupForm } from "./SignupForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return { title: `${t("marketing.signup.title")} — ${BRAND_NAME}` };
}

export default async function SignupPage() {
  const { t } = await getMarketingTranslator();
  const rootDomain = process.env.PLATFORM_ROOT_DOMAIN || "amarshop.com";

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-8 max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">{t("marketing.signup.title")}</h1>
        <p className="mt-2 text-gray-600">{t("marketing.signup.subtitle")}</p>
        <p className="mt-1 text-sm text-gray-500">
          {t("marketing.signup.trialLine", { days: TRIAL_DAYS })}
        </p>
      </div>
      <SignupForm rootDomain={rootDomain} />
    </section>
  );
}
