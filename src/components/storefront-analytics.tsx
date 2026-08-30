import Script from "next/script";
import { safeStoreAnalytics, type StoreAnalytics } from "@/lib/analytics/config";

// Injects the merchant's own GA4 + Meta Pixel tags into the storefront and
// fires PageView. Rendered by StorefrontHeader, so it covers every
// storefront page and nothing else (never the admin or platform host).
// Renders nothing when the merchant hasn't configured either id.
//
// Every id is re-validated here (safeStoreAnalytics) and embedded via
// JSON.stringify — an id is never string-concatenated into script text.
export function StorefrontAnalytics({ analytics }: { analytics: StoreAnalytics }) {
  const { metaPixelId, ga4MeasurementId } = safeStoreAnalytics(analytics);
  if (!metaPixelId && !ga4MeasurementId) return null;

  return (
    <>
      {ga4MeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(
              ga4MeasurementId
            )});`}
          </Script>
        </>
      )}

      {metaPixelId && (
        <>
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(
              metaPixelId
            )});fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
    </>
  );
}
