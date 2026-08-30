import type { FraudCheckAdapter } from "./adapter";
import { type FraudCheckResult, type FraudRiskLevel } from "./types";

const CYCLE: FraudRiskLevel[] = ["safe", "low", "medium", "high", "danger"];

// No network. A deterministic canned verdict keyed off the phone's last
// digit, so the whole feature builds, tests, and demos with no BDCourier
// key — the role src/lib/sms/log.ts plays for SMS. The default provider
// until BDCOURIER_API_KEY is set.
export class StubFraudAdapter implements FraudCheckAdapter {
  readonly provider = "stub";

  async check(phone: string): Promise<FraudCheckResult> {
    const lastDigit = Number(phone.slice(-1)) || 0;
    const riskLevel = CYCLE[lastDigit % CYCLE.length];
    const ratioByLevel: Record<FraudRiskLevel, number> = {
      safe: 97,
      low: 88,
      medium: 72,
      high: 55,
      danger: 31,
      unknown: 0,
    };
    return {
      provider: this.provider,
      riskLevel,
      successRatio: ratioByLevel[riskLevel],
      verdict: `Sample verdict (no BDCourier key configured) — ${riskLevel} risk.`,
      raw: {
        stub: true,
        risk_level: riskLevel,
        success_ratio: ratioByLevel[riskLevel],
        data: { note: "Stub data. Set BDCOURIER_API_KEY for real courier history." },
      },
    };
  }
}
