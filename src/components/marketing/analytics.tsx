import Script from "next/script";
import { normalizeGa4Id, normalizeMetaPixelId } from "@/lib/analytics/config";

// The platform dogfooding its OWN analytics on the marketing site
// (PROJECT_PLAN.md "Analytics/tracking": "Set these up on your own
// marketing site first"). Ids come from the environment —
// MARKETING_GA4_ID / MARKETING_META_PIXEL_ID — and are re-validated
// through the same normalizers the merchant storefront tags use, then
// embedded via JSON.stringify (never string-concatenated into script
// text). Renders nothing when neither is set, so the marketing site works
// with no analytics configured. Rendered once by MarketingShell, so it
// covers every marketing page and nothing else (never the storefront or
// the admin).
export function MarketingAnalytics() {
  const ga4 = normalizeGa4Id(process.env.MARKETING_GA4_ID);
  const pixel = normalizeMetaPixelId(process.env.MARKETING_META_PIXEL_ID);
  if (!ga4 && !pixel) return null;

  return (
    <>
      {ga4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`}
            strategy="afterInteractive"
          />
          <Script id="mkt-ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(
              ga4
            )});`}
          </Script>
        </>
      )}

      {pixel && (
        <>
          <Script id="mkt-fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(
              pixel
            )});fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixel)}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
    </>
  );
}
