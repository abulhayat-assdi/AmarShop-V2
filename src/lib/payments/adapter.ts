export type PaymentInitiationParams = {
  tranId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  // Optional — our checkout form doesn't require an email (matching
  // SITE_STRUCTURE.md's audited checkout), but SSLCommerz's Session API
  // mandates one. CodAdapter ignores all of the fields below entirely.
  customerEmail?: string;
  deliveryZoneName?: string;
  // The store this order belongs to — echoed back on IPN/return so the
  // notification can be resolved to a tenant.
  storeId: string;
  // Where the gateway sends its server-to-server notification, and where it
  // redirects the customer after payment. Both on the store's own host.
  ipnUrl: string;
  returnUrl: string;
  failUrl: string;
  cancelUrl: string;
};

export type PaymentInitiationResult =
  | { kind: "immediate" }
  | { kind: "redirect"; redirectUrl: string };

// Per-store SSLCommerz credentials, resolved from store_payment_settings
// (src/lib/payments/settings.ts) — no longer read from env.
export type SslcommerzConfig = { storeId: string; storePassword: string; sandbox: boolean };

// One implementation per provider (CLAUDE.md rule #5) — the checkout action
// (src/app/(storefront)/checkout/actions.ts) calls only this interface,
// never a provider's SDK/API directly outside that provider's own file.
export interface PaymentAdapter {
  initiate(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
}
