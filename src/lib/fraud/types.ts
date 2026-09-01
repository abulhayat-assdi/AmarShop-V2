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

// Pull the short verdict line out of the stored blob
// (orders.fraudRaw = { provider, verdict, response }). Defensive — may be
// the stub or, on a provider failure, { error: "unavailable" }. Shared by
// the order-detail fraud panel and the /fraud-checker history list.
export function parseFraudVerdict(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as { verdict?: unknown; error?: unknown };
    if (obj.error) return null;
    return typeof obj.verdict === "string" && obj.verdict.trim()
      ? obj.verdict.trim().slice(0, 300)
      : null;
  } catch {
    return null;
  }
}
