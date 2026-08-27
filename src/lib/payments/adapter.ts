export type PaymentInitiationParams = {
  tranId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  // Optional — our checkout form doesn't require an email (matching
  // SITE_STRUCTURE.md's audited checkout), but SSLCommerz's Session API
  // mandates one. CodAdapter ignores both of these entirely.
  customerEmail?: string;
  deliveryZoneName?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
};

export type PaymentInitiationResult =
  | { kind: "immediate" }
  | { kind: "redirect"; redirectUrl: string };

// One implementation per provider (CLAUDE.md rule #5) — the checkout action
// (src/app/(storefront)/checkout/actions.ts) calls only this interface,
// never a provider's SDK/API directly outside that provider's own file.
export interface PaymentAdapter {
  initiate(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
}
