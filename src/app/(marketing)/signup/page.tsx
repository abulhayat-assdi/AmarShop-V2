import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/marketing/constants";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMarketingTranslator();
  return { title: `${t("marketing.signup.title")} — ${BRAND_NAME}` };
}

// Placeholder for Slice 1. The real self-serve signup (account + store +
// trial) is the next marketing-site slice — until it lands, every "Start
// Free Trial" CTA resolves here honestly rather than into a dead flow.
export default async function SignupPage() {
  const { t } = await getMarketingTranslator();

  return (
    <section className="mx-auto flex max-w-md flex-col gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t("marketing.signup.title")}</h1>
      <p className="text-gray-600">{t("marketing.signup.body")}</p>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <span className="text-gray-500">{t("marketing.signup.haveAccount")}</span>
        <Link
          href="/login"
          className="rounded-md bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
        >
          {t("marketing.signup.signIn")}
        </Link>
        <Link href="/" className="mt-2 text-gray-500 hover:text-black">
          {t("marketing.signup.back")}
        </Link>
      </div>
    </section>
  );
}
