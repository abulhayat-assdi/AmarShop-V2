"use client";

import { useActionState, useState } from "react";
import {
  EMAIL_PROVIDERS,
  EMAIL_PROVIDER_CREDENTIAL_FIELDS,
  EMAIL_PROVIDER_LABELS,
  EMAIL_PROVIDER_PRESET,
} from "@/lib/email/providers";
import type { EmailProvider } from "@/lib/email/types";
import { useTranslator } from "@/components/i18n-provider";
import { saveEmailSettingsAction, type EmailSettingsState } from "./actions";

const initialState: EmailSettingsState = {};

export function EmailSettingsForm({
  provider,
  fromName,
  fromEmail,
  host,
  port,
  secure,
  configuredProviders,
}: {
  provider: EmailProvider | null;
  fromName: string | null;
  fromEmail: string | null;
  host: string | null;
  port: number | null;
  secure: boolean;
  configuredProviders: EmailProvider[];
}) {
  const [state, formAction, isPending] = useActionState(saveEmailSettingsAction, initialState);
  const t = useTranslator();
  const [prov, setProv] = useState<string>(provider ?? "");
  const [hostVal, setHostVal] = useState(host ?? "");
  const [portVal, setPortVal] = useState(port != null ? String(port) : "");
  const [secureVal, setSecureVal] = useState(secure);

  const field = "rounded border border-gray-300 px-3 py-2";

  const onProviderChange = (value: string) => {
    setProv(value);
    const preset = EMAIL_PROVIDER_PRESET[value as EmailProvider];
    if (preset) {
      setHostVal(preset.host);
      setPortVal(String(preset.port));
      setSecureVal(preset.secure);
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.emailGateways.settingsSaved")}
        </p>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.emailGateways.provider")}
        <select
          name="provider"
          value={prov}
          onChange={(e) => onProviderChange(e.target.value)}
          className={field}
        >
          <option value="">{t("admin.emailGateways.none")}</option>
          {EMAIL_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {EMAIL_PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          {t("admin.emailGateways.fromNameLabel")}
          <input type="text" name="fromName" defaultValue={fromName ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          {t("admin.emailGateways.fromEmailLabel")}
          <input type="email" name="fromEmail" defaultValue={fromEmail ?? ""} className={field} />
        </label>
      </div>

      {prov !== "" && prov !== "log" && (
        <div className="grid grid-cols-[1fr_8rem] gap-4">
          <label className="flex flex-col gap-1">
            {t("admin.emailGateways.hostLabel")}
            <input
              type="text"
              name="host"
              value={hostVal}
              onChange={(e) => setHostVal(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1">
            {t("admin.emailGateways.portLabel")}
            <input
              type="number"
              name="port"
              value={portVal}
              onChange={(e) => setPortVal(e.target.value)}
              className={field}
            />
          </label>
        </div>
      )}

      {prov !== "" && prov !== "log" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="secure"
            checked={secureVal}
            onChange={(e) => setSecureVal(e.target.checked)}
          />
          {t("admin.emailGateways.secureLabel")}
        </label>
      )}

      {EMAIL_PROVIDERS.filter((p) => EMAIL_PROVIDER_CREDENTIAL_FIELDS[p].length > 0).map((p) => {
        const configured = configuredProviders.includes(p);
        return (
          <fieldset key={p} className="flex flex-col gap-2 rounded border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("admin.emailGateways.credentials", { provider: EMAIL_PROVIDER_LABELS[p] })}
              {configured && (
                <span className="ml-2 text-xs text-green-700">{t("admin.emailGateways.saved")}</span>
              )}
            </legend>
            {EMAIL_PROVIDER_CREDENTIAL_FIELDS[p].map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                {f.label}
                <input
                  type={f.type === "password" ? "password" : "text"}
                  name={`cred.${p}.${f.key}`}
                  autoComplete="off"
                  placeholder={configured ? t("admin.emailGateways.leaveBlank") : ""}
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
        {isPending ? t("admin.common.saving") : t("admin.emailGateways.saveSettings")}
      </button>
    </form>
  );
}
