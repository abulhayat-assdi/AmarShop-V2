// Client-safe metadata (labels + which credential fields each gateway
// needs). The payment-settings form renders from this; the adapters and
// the settings resolver are server-only.

export const PAYMENT_GATEWAYS = ["sslcommerz"] as const;
export type PaymentGateway = (typeof PAYMENT_GATEWAYS)[number];

export const PAYMENT_GATEWAY_LABELS: Record<PaymentGateway, string> = {
  sslcommerz: "SSLCommerz",
};

export type GatewayCredentialField = {
  key: string;
  label: string;
  type: "text" | "password";
};

export const PAYMENT_GATEWAY_CREDENTIAL_FIELDS: Record<PaymentGateway, GatewayCredentialField[]> = {
  sslcommerz: [
    { key: "storeId", label: "Store ID", type: "text" },
    { key: "storePassword", label: "Store Password", type: "password" },
  ],
};
