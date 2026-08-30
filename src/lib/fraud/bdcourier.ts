import type { FraudCheckAdapter } from "./adapter";
import { FraudApiError } from "./adapter";
import { FRAUD_RISK_LEVELS, type FraudCheckResult, type FraudRiskLevel } from "./types";

// Built against BDCourier's published API contract
// (https://bdcourier.com/api-docs) — NOT yet exercised against a live key.
//
//   POST {base}/courier-check   Authorization: Bearer <key>   body { phone }
//   -> { status, phone, success_ratio, risk_level, risk_verdict, data }
//
// `data` is a courier-wise breakdown (pathao/steadfast/redx/paperfly …);
// we keep the whole body in `raw` for the admin panel and only read the
// documented top-level fields for logic.
const DEFAULT_BASE_URL = "https://api.bdcourier.com";

type CheckResponse = {
  status?: string;
  success_ratio?: number | string;
  risk_level?: string;
  risk_verdict?: unknown;
  message?: string;
  [key: string]: unknown;
};

function toRiskLevel(raw: unknown): FraudRiskLevel {
  return typeof raw === "string" && (FRAUD_RISK_LEVELS as string[]).includes(raw)
    ? (raw as FraudRiskLevel)
    : "unknown";
}

function toVerdict(response: CheckResponse): string | null {
  const v = response.risk_verdict;
  if (typeof v === "string" && v.trim()) return v.trim().slice(0, 400);
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    const line = obj.message ?? obj.summary ?? obj.verdict ?? obj.note;
    if (typeof line === "string" && line.trim()) return line.trim().slice(0, 400);
  }
  if (typeof response.message === "string" && response.message.trim()) {
    return response.message.trim().slice(0, 400);
  }
  return null;
}

export class BdCourierAdapter implements FraudCheckAdapter {
  readonly provider = "bdcourier";

  constructor(private readonly config: { apiKey: string; baseUrl: string }) {}

  async check(phone: string): Promise<FraudCheckResult> {
    const url = `${(this.config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "")}/courier-check`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ phone }),
      });
    } catch (err) {
      throw new FraudApiError("bdcourier", err instanceof Error ? err.message : "network error");
    }

    if (!res.ok) {
      console.error(`[fraud:bdcourier] HTTP ${res.status} from ${url}`);
      throw new FraudApiError("bdcourier", `HTTP ${res.status}`);
    }

    const data = (await res.json()) as CheckResponse;
    if (data.status === "error") {
      console.error(`[fraud:bdcourier] error response: ${data.message ?? "-"}`);
      throw new FraudApiError("bdcourier", "provider returned error");
    }

    const ratio = Number(data.success_ratio);
    return {
      provider: this.provider,
      riskLevel: toRiskLevel(data.risk_level),
      successRatio: Number.isFinite(ratio) ? ratio : null,
      verdict: toVerdict(data),
      raw: data,
    };
  }
}
