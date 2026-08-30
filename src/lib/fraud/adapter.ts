import type { FraudCheckResult } from "./types";

// One implementation per fraud-check provider (CLAUDE.md rule #5). The app
// only ever talks to this interface — never a provider's HTTP API
// directly, outside that provider's own file. createFraudCheckAdapter()
// (src/lib/fraud/index.ts) is the single construction site.
export interface FraudCheckAdapter {
  readonly provider: string;
  check(phone: string): Promise<FraudCheckResult>;
}

// No provider / API key configured for this deploy.
export class FraudNotConfiguredError extends Error {
  constructor(detail: string) {
    super(`Fraud checking isn't configured. (${detail})`);
    this.name = "FraudNotConfiguredError";
  }
}

// Any failed provider call (bad key, rejected request, network, malformed
// or error response). The provider's own wording is logged, never
// surfaced to a merchant.
export class FraudApiError extends Error {
  constructor(provider: string, detail: string) {
    super(`${provider} fraud check failed: ${detail}`);
    this.name = "FraudApiError";
  }
}
