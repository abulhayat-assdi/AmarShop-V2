"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { sendTestEmailAction, type SendTestState } from "./actions";

const initialState: SendTestState = {};

export function SendTestEmailForm() {
  const [state, formAction, isPending] = useActionState(sendTestEmailAction, initialState);
  const t = useTranslator();

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4">
      <h2 className="font-medium">{t("admin.emailGateways.testTitle")}</h2>
      <p className="text-sm text-gray-600">{t("admin.emailGateways.testHint")}</p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          {t("admin.emailGateways.testEmailLabel")}
          <input
            type="email"
            name="to"
            required
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("admin.emailGateways.testSending") : t("admin.emailGateways.testSubmit")}
        </button>
      </div>

      {state.error && (
        <p className="text-sm text-red-700">{t(state.error.key, state.error.vars)}</p>
      )}
      {state.ok && <p className="text-sm text-green-700">{t("admin.emailGateways.testSent")}</p>}
    </form>
  );
}
