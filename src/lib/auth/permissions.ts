// The single source of truth for what a custom staff role may grant —
// referenced by /roles (create/edit), custom_roles' DB write validation,
// requirePermission() (./roles.ts), and the admin nav filter
// (src/app/(admin)/layout.tsx). Mirrors the shape of API_SCOPES
// (src/lib/api/scopes.ts) / WEBHOOK_EVENTS (src/lib/webhooks/events.ts).
//
// Scope: this catalogue covers exactly the actions that were
// requireRole("admin")-gated before /roles existed — owner and admin keep
// their unchanged, automatic full access (the rank check in
// requireRole()/requirePermission() runs first); a custom role only ever
// ADDS access for the "staff" rank, which had zero access to any of these
// before. Products/orders/customers/categories stay open to every staff
// role regardless (requireStaffSession() — day-to-day order/catalog work
// was never admin-gated) and aren't part of this catalogue.
export const PERMISSIONS = [
  "discounts:manage",
  "staff:manage",
  "content:manage",
  "courier:manage",
  "payment_settings:manage",
  "sms_settings:manage",
  "email_settings:manage",
  "marketing:manage",
  "domain:manage",
  "api_keys:manage",
  "installed_apps:manage",
  "webhooks:manage",
  "billing:manage",
  "support:manage",
  "guest_checkout:manage",
  "settings:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABEL_KEYS: Record<Permission, string> = {
  "discounts:manage": "admin.roles.permission.discounts",
  "staff:manage": "admin.roles.permission.staff",
  "content:manage": "admin.roles.permission.content",
  "courier:manage": "admin.roles.permission.courier",
  "payment_settings:manage": "admin.roles.permission.paymentSettings",
  "sms_settings:manage": "admin.roles.permission.smsSettings",
  "email_settings:manage": "admin.roles.permission.emailSettings",
  "marketing:manage": "admin.roles.permission.marketing",
  "domain:manage": "admin.roles.permission.domain",
  "api_keys:manage": "admin.roles.permission.apiKeys",
  "installed_apps:manage": "admin.roles.permission.installedApps",
  "webhooks:manage": "admin.roles.permission.webhooks",
  "billing:manage": "admin.roles.permission.billing",
  "support:manage": "admin.roles.permission.support",
  "guest_checkout:manage": "admin.roles.permission.guestCheckout",
  "settings:manage": "admin.roles.permission.settings",
};

export function isValidPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function parsePermissions(input: string | string[]): Permission[] {
  const raw = Array.isArray(input) ? input : input.split(",");
  const out = new Set<Permission>();
  for (const p of raw) {
    const trimmed = p.trim();
    if (isValidPermission(trimmed)) out.add(trimmed);
  }
  return [...out];
}

export function serializePermissions(perms: Permission[]): string {
  return [...new Set(perms)].join(",");
}

// Which permission a nav item needs to be worth showing a "staff" role
// (owner/admin always see the full nav — src/app/(admin)/layout.tsx). A
// href with no entry here is always shown (it's either public to every
// staff role, like Orders/Products, or has no nav entry at all).
export const NAV_PERMISSION: Partial<Record<string, Permission>> = {
  "/coupons": "discounts:manage",
  "/staff": "staff:manage",
  "/roles": "staff:manage",
  "/content": "content:manage",
  "/media": "content:manage",
  "/forms": "content:manage",
  "/courier-settings": "courier:manage",
  "/payment-settings": "payment_settings:manage",
  "/sms-settings": "sms_settings:manage",
  "/email-gateways": "email_settings:manage",
  "/marketing-settings": "marketing:manage",
  "/domain-settings": "domain:manage",
  "/api-keys": "api_keys:manage",
  "/installed-apps": "installed_apps:manage",
  "/webhooks": "webhooks:manage",
  "/billing": "billing:manage",
  "/support": "support:manage",
  "/guest-checkout": "guest_checkout:manage",
  "/appearance": "settings:manage",
  "/menu-builder": "settings:manage",
  "/checkout-settings": "settings:manage",
  "/default-pages": "settings:manage",
};
