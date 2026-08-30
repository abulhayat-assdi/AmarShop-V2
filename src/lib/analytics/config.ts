// The security boundary for the merchant analytics ids. Both values end up
// inside a <script> on the storefront (src/components/storefront-analytics.tsx),
// so anything that doesn't match these exact shapes is turned into null
// here and never stored, never rendered. Client-safe: no imports.

export const META_PIXEL_RE = /^\d{5,20}$/;
export const GA4_MEASUREMENT_RE = /^G-[A-Z0-9]{4,20}$/;

export type StoreAnalytics = {
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
};

// Meta Pixel ids are all digits. Returns the cleaned id or null.
export function normalizeMetaPixelId(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return META_PIXEL_RE.test(v) ? v : null;
}

// GA4 measurement ids look like "G-XXXXXXXXXX". Case-insensitive input,
// stored/rendered uppercase. Returns the cleaned id or null.
export function normalizeGa4Id(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toUpperCase();
  return GA4_MEASUREMENT_RE.test(v) ? v : null;
}

// Re-validate at render time too — defence in depth against a value that
// somehow reached the column without going through the save action.
export function safeStoreAnalytics(input: StoreAnalytics): StoreAnalytics {
  return {
    metaPixelId: normalizeMetaPixelId(input.metaPixelId),
    ga4MeasurementId: normalizeGa4Id(input.ga4MeasurementId),
  };
}
