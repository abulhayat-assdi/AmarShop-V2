import type { Order, Payment, Product, StaffMember } from "@/db/schema";

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
