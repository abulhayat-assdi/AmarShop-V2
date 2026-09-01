"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { FRAUD_RISK_LEVEL_KEYS } from "@/lib/enum-labels";
import type { FraudRiskLevel } from "@/lib/fraud";
import { lookupPhoneAction, type LookupState } from "./actions";

const initialState: LookupState = {};

// Client-safe copy of RiskBadge's palette (that component is an async
// Server Component and can't be used here).
const RISK_CLASSES: Record<FraudRiskLevel, string> = {
  safe: "bg-green-100 text-green-800",
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  danger: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-600",
};

export function PhoneLookup() {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(lookupPhoneAction, initialState);

  return (
    <section className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4">
      <div>
        <h2 className="font-medium">{t("admin.fraudChecker.lookupTitle")}</h2>
        <p className="text-sm text-gray-600">{t("admin.fraudChecker.lookupHint")}</p>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          {t("admin.fraudChecker.phoneLabel")}
          <input
            name="phone"
            required
            defaultValue={state.phone ?? ""}
            placeholder="01XXXXXXXXX"
            className="rounded border border-gray-300 px-3 py-2 font-mono"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("admin.fraudChecker.checking") : t("admin.fraudChecker.checkSubmit")}
        </button>
      </form>

      {state.error === "phone" && (
        <p className="text-sm text-red-700">{t("admin.fraudChecker.errPhone")}</p>
      )}
      {state.error === "unavailable" && (
        <p className="text-sm text-red-700">{t("admin.fraudChecker.errUnavailable")}</p>
      )}

      {state.result && (
        <div className="flex flex-col gap-1 rounded border bg-white p-3 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${RISK_CLASSES[state.result.riskLevel]}`}
            >
              {t(FRAUD_RISK_LEVEL_KEYS[state.result.riskLevel])}
            </span>
            {state.result.successRatio != null && (
              <span className="text-gray-600">
                {t("admin.orders.fraudSuccessRatio", { ratio: state.result.successRatio })}
              </span>
            )}
          </div>
          <p className="text-gray-600">{t(`admin.orders.fraudAdvice.${state.result.riskLevel}`)}</p>
          {state.result.verdict && <p className="text-gray-500">{state.result.verdict}</p>}
          <p className="mt-1 text-xs text-gray-400">{t("admin.fraudChecker.notSaved")}</p>
        </div>
      )}
    </section>
  );
}
