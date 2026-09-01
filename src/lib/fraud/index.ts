import type { FraudCheckAdapter } from "./adapter";
import { BdCourierAdapter } from "./bdcourier";
import { StubFraudAdapter } from "./stub";

export type { FraudCheckAdapter } from "./adapter";
export { FraudApiError, FraudNotConfiguredError } from "./adapter";
export type { FraudCheckResult, FraudRiskLevel } from "./types";
export { FRAUD_RISK_LEVELS, parseFraudVerdict } from "./types";

// The single construction site (CLAUDE.md rule #5). One platform-level
// BDCourier token (BDCOURIER_API_KEY) serves every store; without it the
// offline stub keeps the feature working locally.
export function createFraudCheckAdapter(): FraudCheckAdapter {
  const apiKey = process.env.BDCOURIER_API_KEY;
  if (apiKey) {
    return new BdCourierAdapter({
      apiKey,
      baseUrl: process.env.BDCOURIER_BASE_URL || "https://api.bdcourier.com",
    });
  }
  return new StubFraudAdapter();
}
