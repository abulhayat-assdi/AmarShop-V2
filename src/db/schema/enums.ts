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

// A notices row (src/db/schema/notices.ts) — drives the admin bell's badge
// color/ordering. See src/lib/notices/categories.ts for which `category`
// gets which severity.
export const noticeSeverityEnum = pgEnum("notice_severity", ["info", "warning", "critical"]);

// A nav_menu_items row (src/db/schema/nav-menu-items.ts) — what the item
// links to. "custom_link" uses its own `url`; "page"/"category" resolve
// their href from the referenced row's slug at read time (so a renamed
// page/category slug never leaves a dangling link).
export const navMenuItemKindEnum = pgEnum("nav_menu_item_kind", ["custom_link", "page", "category"]);

// A checkout_custom_fields row's input type (src/db/schema/checkout-custom-fields.ts).
// Dropdown/checkbox are deliberately not included yet — see CLAUDE.md's
// "Deliberately not built" note for this batch.
export const checkoutFieldTypeEnum = pgEnum("checkout_field_type", ["text", "textarea"]);

// A media_assets row (src/db/schema/media-assets.ts) — the store's own
// Media Library. Distinct from mediaKindEnum (product photos/videos):
// the library accepts images and PDF documents, never video. Images are
// re-encoded to WebP on upload; documents are stored as-is.
export const mediaAssetKindEnum = pgEnum("media_asset_kind", ["image", "document"]);

// A form_fields row's input type (src/db/schema/form-fields.ts) — the
// store's own custom forms (Admin -> Forms). "dropdown"/"radio"/"checkbox"
// read their choices from form_fields.options (one per line);
// FORM_FIELD_TYPES in src/lib/forms/types.ts is the client-safe mirror.
export const formFieldTypeEnum = pgEnum("form_field_type", [
  "text",
  "email",
  "phone",
  "textarea",
  "dropdown",
  "radio",
  "checkbox",
  "number",
  "date",
]);

// A forms row's publish state (src/db/schema/forms.ts) — same shape as
// contentStatusEnum: only "published" forms render at /form/[slug].
export const formStatusEnum = pgEnum("form_status", ["draft", "published"]);

// One technical adapter (src/lib/email/smtp.ts, nodemailer over SMTP)
// serves smtp/sendgrid/mailgun/ses — they're all SMTP-shaped
// (host+port+username+password); this enum is the provider *label* a
// merchant picks (drives host/port presets + credential-blob key), not a
// separate implementation per value. "log" mirrors smsProviderEnum's dev
// fallback. See src/db/schema/store-email-settings.ts.
export const emailProviderEnum = pgEnum("email_provider", [
  "smtp",
  "sendgrid",
  "mailgun",
  "ses",
  "log",
]);

// An email_messages row's delivery outcome — same 3-value shape as
// smsMessageStatusEnum. Today every send is synchronous (Admin -> Email
// Gateways' "Send test email"), so "pending" is unused in practice but
// kept for parity / a future async send path.
export const emailMessageStatusEnum = pgEnum("email_message_status", [
  "pending",
  "sent",
  "failed",
]);
