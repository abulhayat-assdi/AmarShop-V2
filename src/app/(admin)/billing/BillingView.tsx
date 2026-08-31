"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import {
  PLANS,
  SELF_SERVE_PLAN_IDS,
  planPrice,
  type BillingCycle,
} from "@/lib/billing/plans";
import { WALLET_PROVIDER_KEYS } from "@/lib/enum-labels";
import { selectPlanAction, submitPaymentAction, type BillingActionState } from "./actions";

const initial: BillingActionState = {};

export type PendingInvoiceView = {
  id: string;
  amount: string;
  periodStart: string;
  periodEnd: string;
  hasReport: boolean;
};

export function BillingView({
  committedPlan,
  pending,
  platform,
}: {
  committedPlan: string;
  pending: PendingInvoiceView | null;
  platform: { bkashNumber: string | null; nagadNumber: string | null; instructions: string | null };
}) {
  const t = useTranslator();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [planState, planAction, planPending] = useActionState(selectPlanAction, initial);
  const [payState, payAction, payPending] = useActionState(
    submitPaymentAction.bind(null, pending?.id ?? ""),
    initial
  );

  const noPlatformNumbers = !platform.bkashNumber && !platform.nagadNumber;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("billing.choosePlanTitle")}</h2>
          <div className="flex overflow-hidden rounded border text-sm">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={cycle === "monthly" ? "bg-black px-3 py-1 text-white" : "px-3 py-1"}
            >
              {t("billing.cycle.monthly")}
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={cycle === "yearly" ? "bg-black px-3 py-1 text-white" : "px-3 py-1"}
            >
              {t("billing.cycle.yearly")}
            </button>
          </div>
        </div>

        {planState.error && (
          <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
            {t(planState.error.key, planState.error.vars)}
          </p>
        )}
        {planState.ok && (
          <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
            {t(planState.ok.key, planState.ok.vars)}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SELF_SERVE_PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            const isCurrent = committedPlan === id;
            return (
              <div key={id} className="flex flex-col gap-3 rounded border p-4">
                <div className="font-semibold">{t(plan.nameKey)}</div>
                <div className="text-sm">
                  {cycle === "monthly"
                    ? t("billing.perMonth", { amount: planPrice(id, "monthly") })
                    : t("billing.perYear", { amount: planPrice(id, "yearly") })}
                </div>
                {cycle === "yearly" && plan.monthlyPrice > 0 && (
                  <div className="text-xs text-green-700">{t("billing.yearlyNote")}</div>
                )}
                <div className="text-xs text-gray-600">
                  {plan.limits.products === null
                    ? t("billing.planUnlimited")
                    : `${t("billing.planProducts", { n: plan.limits.products })} · ${t(
                        "billing.planStaff",
                        { n: plan.limits.staff ?? 0 }
                      )}`}
                </div>
                {isCurrent ? (
                  <span className="mt-auto rounded bg-gray-100 px-2 py-1 text-center text-xs">
                    {t("billing.currentBadge")}
                  </span>
                ) : (
                  <form action={planAction} className="mt-auto">
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="cycle" value={cycle} />
                    <button
                      type="submit"
                      disabled={planPending}
                      className="w-full rounded bg-black px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {t("billing.choose", { plan: t(plan.nameKey) })}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
          <div className="flex flex-col gap-2 rounded border border-dashed p-4">
            <div className="font-semibold">{t(PLANS.enterprise.nameKey)}</div>
            <div className="text-xs text-gray-600">{t("billing.enterpriseContact")}</div>
          </div>
        </div>
      </section>

      {pending && (
        <section className="flex flex-col gap-3 rounded border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold">{t("billing.pendingTitle")}</h2>
          <p className="text-sm">{t("billing.amountDue", { amount: Number(pending.amount) })}</p>
          <p className="text-xs text-gray-600">
            {t("billing.periodLabel", { start: pending.periodStart, end: pending.periodEnd })}
          </p>

          {pending.hasReport ? (
            <p className="rounded border border-green-400 bg-white px-3 py-2 text-sm text-green-700">
              {t("billing.awaitingVerification")}
            </p>
          ) : noPlatformNumbers ? (
            <p className="text-sm text-red-700">{t("billing.noPlatformNumbers")}</p>
          ) : (
            <>
              <p className="text-sm">{t("billing.payVia")}</p>
              <ul className="flex flex-col gap-1 text-sm">
                {platform.bkashNumber && (
                  <li>
                    {t("common.walletBkash")}:{" "}
                    <span className="font-mono">{platform.bkashNumber}</span>
                  </li>
                )}
                {platform.nagadNumber && (
                  <li>
                    {t("common.walletNagad")}:{" "}
                    <span className="font-mono">{platform.nagadNumber}</span>
                  </li>
                )}
              </ul>
              {platform.instructions && (
                <p className="text-xs text-gray-600">{platform.instructions}</p>
              )}

              <form action={payAction} className="flex flex-col gap-3">
                {payState.error && (
                  <p className="rounded border border-red-400 bg-white px-3 py-2 text-sm text-red-700">
                    {t(payState.error.key, payState.error.vars)}
                  </p>
                )}
                <fieldset className="flex flex-col gap-1 text-sm">
                  <legend className="font-medium">{t("billing.walletProvider")}</legend>
                  <div className="flex gap-4">
                    {(["bkash", "nagad"] as const).map((w) => (
                      <label key={w} className="flex items-center gap-2">
                        <input type="radio" name="walletProvider" value={w} />
                        {t(WALLET_PROVIDER_KEYS[w])}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-1 text-sm">
                  {t("billing.senderNumber")}
                  <input
                    type="text"
                    name="senderMsisdn"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="01XXXXXXXXX"
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  {t("billing.trxId")}
                  <input
                    type="text"
                    name="senderReference"
                    autoComplete="off"
                    className="rounded border border-gray-300 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={payPending}
                  className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {payPending ? t("billing.submitting") : t("billing.submitPayment")}
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
