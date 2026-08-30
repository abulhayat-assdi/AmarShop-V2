"use client";

import { useActionState, useState } from "react";
import {
  PAYMENT_GATEWAYS,
  PAYMENT_GATEWAY_CREDENTIAL_FIELDS,
  PAYMENT_GATEWAY_LABELS,
  type PaymentGateway,
} from "@/lib/payments/gateways";
import { useTranslator } from "@/components/i18n-provider";
import { savePaymentSettingsAction, type PaymentSettingsState } from "./actions";

const initialState: PaymentSettingsState = {};

export function PaymentSettingsForm({
  sandbox,
  configuredGateways,
  manualWalletEnabled,
  bkashNumber,
  nagadNumber,
  manualInstructions,
}: {
  sandbox: boolean;
  configuredGateways: PaymentGateway[];
  manualWalletEnabled: boolean;
  bkashNumber: string | null;
  nagadNumber: string | null;
  manualInstructions: string | null;
}) {
  const [state, formAction, isPending] = useActionState(savePaymentSettingsAction, initialState);
  const t = useTranslator();
  const [isSandbox, setIsSandbox] = useState(sandbox);
  const [manualOn, setManualOn] = useState(manualWalletEnabled);
  const [bkash, setBkash] = useState(bkashNumber ?? "");
  const [nagad, setNagad] = useState(nagadNumber ?? "");
  const [instructions, setInstructions] = useState(manualInstructions ?? "");

  const inputCls = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.payment.settingsSaved")}
        </p>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sandbox"
          checked={isSandbox}
          onChange={(e) => setIsSandbox(e.target.checked)}
        />
        {t("admin.payment.sandbox")}
      </label>

      {PAYMENT_GATEWAYS.map((g) => {
        const configured = configuredGateways.includes(g);
        return (
          <fieldset key={g} className="flex flex-col gap-2 rounded border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("admin.payment.credentials", { gateway: PAYMENT_GATEWAY_LABELS[g] })}
              {configured && (
                <span className="ml-2 text-xs text-green-700">{t("admin.payment.saved")}</span>
              )}
            </legend>
            {PAYMENT_GATEWAY_CREDENTIAL_FIELDS[g].map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-sm">
                {field.label}
                <input
                  type={field.type === "password" ? "password" : "text"}
                  name={`cred.${g}.${field.key}`}
                  autoComplete="off"
                  placeholder={configured ? t("admin.payment.leaveBlank") : ""}
                  className="rounded border border-gray-300 px-3 py-2"
                />
              </label>
            ))}
          </fieldset>
        );
      })}

      <fieldset className="flex flex-col gap-3 rounded border p-4">
        <legend className="px-1 text-sm font-semibold">{t("admin.payment.manualTitle")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="manualWalletEnabled"
            checked={manualOn}
            onChange={(e) => setManualOn(e.target.checked)}
          />
          {t("admin.payment.manualEnable")}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.payment.manualBkashNumber")}
          <input
            type="text"
            name="bkashNumber"
            inputMode="numeric"
            autoComplete="off"
            placeholder="01XXXXXXXXX"
            value={bkash}
            onChange={(e) => setBkash(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.payment.manualNagadNumber")}
          <input
            type="text"
            name="nagadNumber"
            inputMode="numeric"
            autoComplete="off"
            placeholder="01XXXXXXXXX"
            value={nagad}
            onChange={(e) => setNagad(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.payment.manualInstructions")}
          <textarea
            name="manualInstructions"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className={inputCls}
          />
          <span className="text-xs text-gray-500">{t("admin.payment.manualInstructionsHint")}</span>
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.payment.saveSettings")}
      </button>
    </form>
  );
}
