import { getMarketingTranslator } from "@/lib/i18n/marketing-server";
import { hasPublishedTestimonials } from "@/lib/testimonials/query";
import { hasPublishedPosts } from "@/lib/blog/query";
import { I18nProvider } from "@/components/i18n-provider";
import { MarketingHeader, MarketingFooter } from "./chrome";

// The marketing chrome (header + footer + I18nProvider), the counterpart
// to StorefrontShell. Used by any marketing route that lives OUTSIDE the
// (marketing) route group because its path is shared with the storefront —
// currently /blog (src/app/blog/). The (marketing) layout and
// src/app/page.tsx's marketing branch inline the same thing; they can be
// folded onto this later.
export async function MarketingShell({ children }: { children: React.ReactNode }) {
  const { locale, messages, t } = await getMarketingTranslator();
  const [hasTestimonials, hasBlog] = await Promise.all([
    hasPublishedTestimonials(),
    hasPublishedPosts(),
  ]);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <MarketingHeader t={t} locale={locale} hasTestimonials={hasTestimonials} hasBlog={hasBlog} />
      <main className="flex-1">{children}</main>
      <MarketingFooter t={t} hasTestimonials={hasTestimonials} hasBlog={hasBlog} />
    </I18nProvider>
  );
}
