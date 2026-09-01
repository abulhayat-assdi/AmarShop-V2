import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { hasPublishedTestimonials } from "@/lib/testimonials/query";
import { I18nProvider } from "@/components/i18n-provider";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/chrome";

// The public marketing site (SITE_STRUCTURE.md Part A) — only ever served
// on the platform's own host, never on a merchant storefront. proxy.ts
// attaches no store for the platform host, so getCurrentStore() is null
// here; if a tenant host somehow reaches one of these paths (the
// storefront has no /features, /pricing, … route of its own), 404 rather
// than render marketing chrome on a merchant's domain.
//
// The homepage itself ("/") can't live in this route group — it's the one
// path shared with the storefront branch, so src/app/page.tsx renders the
// same chrome components directly (mirrors the storefront chrome split).
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentStore()) {
    notFound();
  }

  const { locale, messages, t } = await getMarketingTranslator();
  const hasTestimonials = await hasPublishedTestimonials();

  // Rendered into the root layout's <body className="min-h-full flex
  // flex-col">, so header / main / footer are direct flex children and
  // `main flex-1` keeps the footer at the bottom — same shape as the
  // storefront layout, no wrapper div.
  return (
    <I18nProvider locale={locale} messages={messages}>
      <MarketingHeader t={t} locale={locale} hasTestimonials={hasTestimonials} />
      <main className="flex-1">{children}</main>
      <MarketingFooter t={t} hasTestimonials={hasTestimonials} />
    </I18nProvider>
  );
}
