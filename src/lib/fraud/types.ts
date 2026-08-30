// Client-safe fraud-check metadata. The adapters and the service wrapper
// are server-only.

export type FraudRiskLevel = "safe" | "low" | "medium" | "high" | "danger" | "unknown";

export const FRAUD_RISK_LEVELS: readonly FraudRiskLevel[] = [
  "safe",
  "low",
  "medium",
  "high",
  "danger",
  "unknown",
];

export type FraudCheckResult = {
  provider: string;
  riskLevel: FraudRiskLevel;
  // BDCourier's delivery-success percentage for the phone, if returned.
  successRatio: number | null;
  // A short human-readable verdict line, if the provider gives one.
  verdict: string | null;
  // The provider's full response (courier-wise data + risk_verdict),
  // stored for the admin detail panel. Opaque — never trusted for logic.
  raw: unknown;
};
