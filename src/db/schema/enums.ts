import { pgEnum } from "drizzle-orm/pg-core";

export const staffRoleEnum = pgEnum("staff_role", ["owner", "admin", "staff"]);

export const storeStatusEnum = pgEnum("store_status", [
  "pending",
  "active",
  "suspended",
]);

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const cartStatusEnum = pgEnum("cart_status", [
  "active",
  "converted",
  "abandoned",
]);

// A content_entries row (see content-entries.ts) is either a blog post or
// a static storefront page — same shape (a slug'd markdown document with a
// publish state), told apart by `kind`.
export const contentKindEnum = pgEnum("content_kind", ["post", "page"]);

export const contentStatusEnum = pgEnum("content_status", ["draft", "published"]);

// A checkout_leads row (see checkout-leads.ts): a customer who entered
// their name + phone at checkout but hasn't completed the order. "pending"
// = awaiting a follow-up call, "contacted" = the merchant has called,
// "converted" = they later placed the order (row kept for analytics),
// "dismissed" = the merchant judged it dead.
export const checkoutLeadStatusEnum = pgEnum("checkout_lead_status", [
  "pending",
  "contacted",
  "converted",
  "dismissed",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "placed",
  "confirmed",
  "ready",
  "shipped",
  "delivered",
  "completed",
  "canceled",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["cod", "sslcommerz", "manual_wallet"]);

// Which mobile wallet a "manual_wallet" payment was sent through — the
// customer sends money by hand and enters the TrxID at checkout, the
// merchant verifies it. See src/lib/payments/manual-wallet.ts.
export const walletProviderEnum = pgEnum("wallet_provider", ["bkash", "nagad"]);

// COD fraud risk for an order, from the BDCourier customer-check API
// (src/lib/fraud). "unknown" = the check ran but couldn't classify, or
// the provider was unavailable.
export const fraudRiskLevelEnum = pgEnum("fraud_risk_level", [
  "safe",
  "low",
  "medium",
  "high",
  "danger",
  "unknown",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

// "pending"   = invoice row exists, its PDF hasn't been rendered yet
// "generated" = PDF rendered and persisted via the storage adapter
//               (invoices.storage_key is set)
export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "generated"]);

// A product_media row is one uploaded photo or video (see product-media.ts).
export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);

// One courier adapter per value (src/lib/courier). Adding a courier means
// adding a value here + its adapter file.
export const courierProviderEnum = pgEnum("courier_provider", ["steadfast", "pathao", "redx"]);

// Order-level coupon discount. "free_delivery" ignores coupons.value and
// zeroes the delivery charge instead. See src/lib/coupons/validate.ts.
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed", "free_delivery"]);

// One SMS adapter per value (src/lib/sms). "log" writes to the console +
// the outbox and never calls out — for local dev / no-gateway stores.
export const smsProviderEnum = pgEnum("sms_provider", ["bulksmsbd", "log"]);

export const smsMessageStatusEnum = pgEnum("sms_message_status", ["pending", "sent", "failed"]);

// Internal, normalised shipment state — each courier adapter maps its own
// provider vocabulary onto this (see src/lib/courier/*).
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "booked",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
  "failed",
]);

// ── Platform billing (CLAUDE.md rule #3: the merchant-pays-the-platform
// system, kept entirely separate from Order/Payment/Invoice). See
// src/lib/billing and src/db/schema/platform-invoices.ts.

// A store's subscription lifecycle. "trialing" = inside the free trial
// window (trial_ends_at); "active" = a platform invoice is paid and
// current_period_ends_at is in the future; "past_due" = the paid period
// lapsed with no renewal; "canceled" = the merchant stopped.
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

// A platform_invoices row: "pending" = created when the merchant picked a
// plan, awaiting their manual payment + our verification; "paid" = a
// platform admin confirmed the bKash/Nagad transfer; "void" = superseded
// by a newer selection or rejected.
export const platformInvoiceStatusEnum = pgEnum("platform_invoice_status", [
  "pending",
  "paid",
  "void",
]);

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

// ── Developer platform (Phase 6). A third-party OAuth app registered from
// /platform/apps. "disabled" kills every installation's access token at
// the next /api/v1 call (the token resolver joins app_installations to
// oauth_apps and rejects a non-active app). See
// src/db/schema/oauth-apps.ts and src/lib/oauth.
export const oauthAppStatusEnum = pgEnum("oauth_app_status", ["active", "disabled"]);

// A webhook_deliveries row (src/db/schema/webhook-deliveries.ts). Delivery
// is attempted inline (up to 3 tries) from the triggering request's
// after() hook, so it always resolves to one of these — there is no
// queued "pending" state. See src/lib/webhooks.
export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", ["success", "failed"]);
