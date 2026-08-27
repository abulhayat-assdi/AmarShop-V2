"use client";

import { useActionState, useState } from "react";
import {
  COURIER_CREDENTIAL_FIELDS,
  COURIER_PROVIDERS,
  COURIER_PROVIDER_LABELS,
} from "@/lib/courier/providers";
import type { CourierProvider } from "@/lib/courier/types";
import { useTranslator } from "@/components/i18n-provider";
import { saveCourierSettingsAction, type CourierSettingsState } from "./actions";

const initialState: CourierSettingsState = {};

export function CourierSettingsForm({
  activeProvider,
  sandbox,
  configuredProviders,
}: {
  activeProvider: CourierProvider | null;
  sandbox: boolean;
  configuredProviders: CourierProvider[];
}) {
  const [state, formAction, isPending] = useActionState(saveCourierSettingsAction, initialState);
  const t = useTranslator();
  const [provider, setProvider] = useState<string>(activeProvider ?? "");
  const [isSandbox, setIsSandbox] = useState(sandbox);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.courier.settingsSaved")}
        </p>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.courier.activeCourier")}
        <select
          name="activeProvider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="">{t("admin.courier.none")}</option>
          {COURIER_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {COURIER_PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sandbox"
          checked={isSandbox}
          onChange={(e) => setIsSandbox(e.target.checked)}
        />
        {t("admin.courier.sandbox")}
      </label>

      {COURIER_PROVIDERS.map((p) => {
        const configured = configuredProviders.includes(p);
        return (
          <fieldset key={p} className="flex flex-col gap-2 rounded border p-4">
            <legend className="px-1 text-sm font-semibold">
              {t("admin.courier.credentials", { provider: COURIER_PROVIDER_LABELS[p] })}
              {configured && (
                <span className="ml-2 text-xs text-green-700">{t("admin.courier.saved")}</span>
              )}
            </legend>
            {COURIER_CREDENTIAL_FIELDS[p].map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-sm">
                {field.label}
                {field.optional && (
                  <span className="text-xs text-gray-400">{t("admin.courier.optional")}</span>
                )}
                <input
                  type={field.type === "password" ? "password" : "text"}
                  name={`cred.${p}.${field.key}`}
                  autoComplete="off"
                  placeholder={configured ? t("admin.courier.leaveBlank") : ""}
                  className="rounded border border-gray-300 px-3 py-2"
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
        {isPending ? t("admin.common.saving") : t("admin.courier.saveSettings")}
      </button>
    </form>
  );
}
