"use server";

import { requireStaffSession } from "@/lib/auth/roles";
import { adHocFraudCheck } from "@/lib/fraud/history";
import type { FraudRiskLevel } from "@/lib/fraud";

// Fraud data is order-adjacent — open to every staff role, like /orders
// (requireStaffSession, no dedicated permission), matching the existing
// order-detail "Re-check" button.
export type LookupState = {
  result?: {
    riskLevel: FraudRiskLevel;
    successRatio: number | null;
    verdict: string | null;
    provider: string;
  };
  error?: "phone" | "unavailable";
  phone?: string;
};

export async function lookupPhoneAction(
  _prev: LookupState,
  formData: FormData
): Promise<LookupState> {
  await requireStaffSession();
  const phone = String(formData.get("phone") ?? "").trim();

  const res = await adHocFraudCheck(phone);
  if ("error" in res) return { error: res.error, phone };

  return {
    phone,
    result: {
      riskLevel: res.ok.riskLevel,
      successRatio: res.ok.successRatio,
      verdict: res.ok.verdict,
      provider: res.ok.provider,
    },
  };
}
