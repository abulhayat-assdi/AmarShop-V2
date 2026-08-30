"use client";

import { useActionState, useState } from "react";
import {
  SMS_PROVIDERS,
  SMS_PROVIDER_CREDENTIAL_FIELDS,
  SMS_PROVIDER_LABELS,
} from "@/lib/sms/providers";
import type { SmsProvider } from "@/lib/sms/types";
import { useTranslator } from "@/components/i18n-provider";
import { saveSmsSettingsAction, type SmsSettingsState } from "./actions";

const initialState: SmsSettingsState = {};

export function SmsSettingsForm({
  provider,
  senderId,
  sandbox,
  notifyOrderPlaced,
  notifyOrderShipped,
  configuredProviders,
}: {
  provider: SmsProvider | null;
  senderId: string | null;
  sandbox: boolean;
  notifyOrderPlaced: boolean;
  notifyOrderShipped: boolean;
  configuredProviders: SmsProvider[];
}) {
  const [state, formAction, isPending] = useActionState(saveSmsSettingsAction, initialState);
  const t = useTranslator();
  const [prov, setProv] = useState<string>(provider ?? "");
  const [isSandbox, setIsSandbox] = useState(sandbox);
  const [placed, setPlaced] = useState(notifyOrderPlaced);
  const [shipped, setShipped] = useState(notifyOrderShipped);

  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.sms.settingsSaved")}
        </p>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.sms.provider")}
        <select
          name="provider"
          value={prov}
          onChange={(e) => setProv(e.target.value)}
          className={field}
        >
          <option value="">{t("admin.sms.none")}</option>
          {SMS_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {SMS_PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.sms.senderId")}
        <input
          type="text"
          name="senderId"
          autoComplete="off"
          defaultValue={senderId ?? ""}
          className={field}
        />
        <span className="text-xs text-gray-500">{t("admin.sms.senderIdHint")}</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sandbox"
          checked={isSandbox}
          onChange={(e) => setIsSandbox(e.target.checked)}
        />
        {t("admin.sms.sandbox")}
      </label>

      <fieldset className="flex flex-col gap-2 rounded border p-4">
        <legend className="px-1 text-sm font-semibold">{t("admin.sms.notifyLegend")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifyOrderPlaced"
            checked={placed}
            onChange={(e) => setPlaced(e.target.checked)}
          />
          {t("admin.sms.notifyPlaced")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifyOrderShipped"
            checked={shipped}
            onChange={(e) => setShipped(e.target.checked)}
          />
          {t("admin.sms.notifyShipped")}
        </label>
      </fieldset>

      {SMS_PROVIDERS.filter((p) => SMS_PROVIDER_CREDENTIAL_FIELDS[p].length > 0).map((p) => {
        const configured = configuredProviders.includes(p);
        return (
          <fieldset key={p} className="flex flex-col gap-2 rounded border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("admin.sms.credentials", { provider: SMS_PROVIDER_LABELS[p] })}
              {configured && (
                <span className="ml-2 text-xs text-green-700">{t("admin.sms.saved")}</span>
              )}
            </legend>
            {SMS_PROVIDER_CREDENTIAL_FIELDS[p].map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                {f.label}
                <input
                  type={f.type === "password" ? "password" : "text"}
                  name={`cred.${p}.${f.key}`}
                  autoComplete="off"
                  placeholder={configured ? t("admin.sms.leaveBlank") : ""}
                  className={field}
                />
              </label>
            ))}
          </fieldset>
        );
      })}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.sms.saveSettings")}
      </button>
    </form>
  );
}
