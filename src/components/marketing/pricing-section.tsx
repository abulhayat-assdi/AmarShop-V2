"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslator } from "@/components/i18n-provider";
import {
  PLANS,
  PLAN_IDS,
  planPrice,
  TRIAL_DAYS,
  type BillingCycle,
  type PlanId,
} from "@/lib/billing/plans";
import { RECOMMENDED_PLAN_ID } from "@/lib/marketing/constants";

// The one pricing component — rendered both as the homepage teaser and as
// the body of /pricing (SITE_STRUCTURE.md Part A: "the exact same shared
// component ... reading from one source of pricing data"). Every price and
// limit comes from src/lib/billing/plans.ts (CLAUDE.md rule #4); this file
// hard-codes no figure.

function limitLabel(
  t: ReturnType<typeof useTranslator>,
  value: number | null,
  keyBase: string
): string {
  return value === null
    ? t(`marketing.pricing.${keyBase}Unlimited`)
    : t(`marketing.pricing.${keyBase}`, { limit: value });
}

export function PricingSection({ showIncludes = false }: { showIncludes?: boolean }) {
  const t = useTranslator();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-center gap-3 text-sm">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            aria-pressed={cycle === c}
            className={`rounded-full px-4 py-1.5 ${
              cycle === c ? "bg-black text-white" : "border border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            {t(`marketing.pricing.toggle.${c}`)}
          </button>
        ))}
        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
          {t("marketing.pricing.toggle.yearlyHint")}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PLAN_IDS.map((id: PlanId) => {
          const plan = PLANS[id];
          const isFree = plan.monthlyPrice === 0;
          const isRecommended = id === RECOMMENDED_PLAN_ID;
          const yearlyTotal = planPrice(id, "yearly");
          return (
            <div
              key={id}
              className={`flex flex-col gap-5 rounded-xl border p-6 ${
                isRecommended ? "border-black shadow-sm" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t(plan.nameKey)}</h3>
                {isRecommended && (
                  <span className="rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
                    {t("marketing.pricing.recommended")}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {isFree ? (
                  <span className="text-3xl font-bold">{t("marketing.pricing.free")}</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">
                      {t("marketing.pricing.perMonth", { price: plan.monthlyPrice.toLocaleString("en-US") })}
                    </span>
                    <span className="text-sm text-gray-500">
                      {cycle === "yearly"
                        ? t("marketing.pricing.billedYearly", { price: yearlyTotal.toLocaleString("en-US") })
                        : t("marketing.pricing.billedMonthly")}
                    </span>
                  </>
                )}
              </div>

              <ul className="flex flex-col gap-2 text-sm text-gray-700">
                <li>✓ {limitLabel(t, plan.limits.products, "limitProducts")}</li>
                <li>✓ {limitLabel(t, plan.limits.staff, "limitStaff")}</li>
                <li>✓ {limitLabel(t, plan.limits.orders, "limitOrders")}</li>
              </ul>

              <Link
                href="/signup"
                className={`mt-auto rounded-md px-4 py-2 text-center text-sm font-medium ${
                  isRecommended
                    ? "bg-black text-white hover:bg-gray-800"
                    : "border border-gray-300 hover:border-gray-400"
                }`}
              >
                {isFree ? t("marketing.pricing.ctaFree") : t("marketing.pricing.cta")}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-500">
        {t("marketing.pricing.trialNote", { days: TRIAL_DAYS })}
      </p>

      {showIncludes && (
        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold">{t("marketing.pricing.allTitle")}</h3>
          <ul className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <li key={n}>✓ {t(`marketing.pricing.inc${n}`)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
