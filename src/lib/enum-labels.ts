import type {
  ContentEntry,
  Coupon,
  Order,
  Payment,
  PlatformInvoice,
  Product,
  StaffMember,
  Store,
} from "@/db/schema";

// The single place every user-facing enum value is mapped to a display
// label (CLAUDE.md rules #4 and #7). Values map to i18n keys, not to
// English strings, so admin screens, the storefront, and the invoice PDF
// all read the same wording from the message files.
//
// The `import type` above is erased at compile time, so this module stays
// client-safe — but it still ties each map to the real Postgres enum, so
// adding a value to src/db/schema/enums.ts fails the build here until a
// label exists for it.

export const ORDER_STATUS_KEYS: Record<Order["status"], string> = {
  placed: "admin.orders.statusPlaced",
  confirmed: "admin.orders.statusConfirmed",
  ready: "admin.orders.statusReady",
  shipped: "admin.orders.statusShipped",
  delivered: "admin.orders.statusDelivered",
  completed: "admin.orders.statusCompleted",
  canceled: "admin.orders.statusCanceled",
};

// Derived, so the value list exists exactly once. Object key order is
// insertion order, which is the pipeline order above.
export const ORDER_STATUSES = Object.keys(ORDER_STATUS_KEYS) as Order["status"][];

export const PAYMENT_STATUS_KEYS: Record<Payment["status"], string> = {
  pending: "admin.orders.payPending",
  paid: "admin.orders.payPaid",
  failed: "admin.orders.payFailed",
  refunded: "admin.orders.payRefunded",
};

export const PAYMENT_METHOD_KEYS: Record<Payment["method"], string> = {
  cod: "common.paymentCod",
  sslcommerz: "common.paymentSslcommerz",
  manual_wallet: "common.paymentManualWallet",
};

export const WALLET_PROVIDER_KEYS: Record<NonNullable<Payment["walletProvider"]>, string> = {
  bkash: "common.walletBkash",
  nagad: "common.walletNagad",
};

export const PRODUCT_STATUS_KEYS: Record<Product["status"], string> = {
  draft: "admin.products.statusDraft",
  active: "admin.products.statusActive",
  archived: "admin.products.statusArchived",
};

export const STAFF_ROLE_KEYS: Record<StaffMember["role"], string> = {
  owner: "admin.shell.roleOwner",
  admin: "admin.shell.roleAdmin",
  staff: "admin.shell.roleStaff",
};

// Store lifecycle (src/db/schema/enums.ts storeStatusEnum) — shown on the
// platform-admin dashboard. "active" = storefront serving; "suspended" =
// blocked (proxy.ts 404s it); "pending" = created, not yet activated.
export const STORE_STATUS_KEYS: Record<Store["status"], string> = {
  pending: "platform.storeStatus.pending",
  active: "platform.storeStatus.active",
  suspended: "platform.storeStatus.suspended",
};

export const STORE_STATUSES = Object.keys(STORE_STATUS_KEYS) as Store["status"][];

export const DISCOUNT_TYPE_KEYS: Record<Coupon["type"], string> = {
  percentage: "admin.coupons.typePercentage",
  fixed: "admin.coupons.typeFixed",
  free_delivery: "admin.coupons.typeFreeDelivery",
};

export const DISCOUNT_TYPES = Object.keys(DISCOUNT_TYPE_KEYS) as Coupon["type"][];

export const CONTENT_STATUS_KEYS: Record<ContentEntry["status"], string> = {
  draft: "admin.content.statusDraft",
  published: "admin.content.statusPublished",
};

export const CONTENT_STATUSES = Object.keys(CONTENT_STATUS_KEYS) as ContentEntry["status"][];

export const FRAUD_RISK_LEVEL_KEYS: Record<NonNullable<Order["fraudRiskLevel"]>, string> = {
  safe: "admin.orders.fraudLevel.safe",
  low: "admin.orders.fraudLevel.low",
  medium: "admin.orders.fraudLevel.medium",
  high: "admin.orders.fraudLevel.high",
  danger: "admin.orders.fraudLevel.danger",
  unknown: "admin.orders.fraudLevel.unknown",
};

// ── Platform billing (merchant → AmarShop). Kept distinct from the
// customer-facing PAYMENT_STATUS_KEYS above (CLAUDE.md rule #3).

export const SUBSCRIPTION_STATUS_KEYS: Record<Store["subscriptionStatus"], string> = {
  trialing: "billing.status.trialing",
  active: "billing.status.active",
  past_due: "billing.status.pastDue",
  canceled: "billing.status.canceled",
};

export const SUBSCRIPTION_STATUSES = Object.keys(
  SUBSCRIPTION_STATUS_KEYS
) as Store["subscriptionStatus"][];

export const PLATFORM_INVOICE_STATUS_KEYS: Record<PlatformInvoice["status"], string> = {
  pending: "billing.invoiceStatus.pending",
  paid: "billing.invoiceStatus.paid",
  void: "billing.invoiceStatus.void",
};

export const BILLING_CYCLE_KEYS: Record<PlatformInvoice["cycle"], string> = {
  monthly: "billing.cycle.monthly",
  yearly: "billing.cycle.yearly",
};
