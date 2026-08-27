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

export const orderStatusEnum = pgEnum("order_status", [
  "placed",
  "confirmed",
  "ready",
  "shipped",
  "delivered",
  "completed",
  "canceled",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["cod", "sslcommerz"]);

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
