// The feature catalogue behind /features (SITE_STRUCTURE.md Part A
// "Features page"). Structure only — every display string is an i18n key
// under marketing.features.* (CLAUDE.md rule #7). The hero's "N+ features"
// claim is derived from FEATURE_COUNT below, so it can never drift from the
// number of cards actually rendered (rule #4 / rule #8) — the exact
// "40+ vs 41+" copy-editing miss SITE_STRUCTURE.md calls out.
//
// 8 categories — the audited product's 9th, "Physical & POS", is dropped
// entirely (out of scope, CLAUDE.md). Its one legitimate card, cloud file
// storage, is folded into "Store & Products" as SITE_STRUCTURE.md directs.

export type FeatureCategory = {
  // i18n key under marketing.features.categories.*
  key: string;
  // i18n keys under marketing.features.items.* — each resolves .title + .desc
  items: readonly string[];
};

export const FEATURE_CATEGORIES: readonly FeatureCategory[] = [
  {
    key: "ai",
    items: ["aiWriter", "aiSeo", "fraudScore", "forecast"],
  },
  {
    key: "store",
    items: ["storefront", "catalog", "variants", "digital", "media", "domains"],
  },
  {
    key: "orders",
    items: ["pipeline", "manualOrder", "invoices", "tracking", "stock"],
  },
  {
    key: "payments",
    items: ["cod", "sslcommerz", "manualWallet", "coupons", "guestCheckout"],
  },
  {
    key: "delivery",
    items: ["redx", "pathao", "steadfast", "deliveryZones", "labels"],
  },
  {
    key: "marketing",
    items: ["metaPixel", "ga4", "blog", "forms", "seoMeta"],
  },
  {
    key: "analytics",
    items: ["dashboard", "lowStock", "restock", "leads"],
  },
  {
    key: "team",
    items: ["staff", "roles", "sms", "publicApi", "apps"],
  },
] as const;

// One source for the hero's feature-count claim.
export const FEATURE_COUNT = FEATURE_CATEGORIES.reduce((n, c) => n + c.items.length, 0);
