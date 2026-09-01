"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { saveSupportSettingsAction, type SupportState } from "./actions";

const initialState: SupportState = {};

export function SupportSettingsForm({
  supportEmail,
  supportPhone,
  supportHours,
}: {
  supportEmail: string | null;
  supportPhone: string | null;
  supportHours: string | null;
}) {
  const [state, formAction, isPending] = useActionState(saveSupportSettingsAction, initialState);
  const t = useTranslator();
  const [email, setEmail] = useState(supportEmail ?? "");
  const [phone, setPhone] = useState(supportPhone ?? "");
  const [hours, setHours] = useState(supportHours ?? "");

  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.support.saved")}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.support.emailLabel")}
        <input
          type="text"
          name="supportEmail"
          autoComplete="off"
          placeholder="support@yourstore.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.support.phoneLabel")}
        <input
          type="text"
          name="supportPhone"
          autoComplete="off"
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.support.hoursLabel")}
        <input
          type="text"
          name="supportHours"
          autoComplete="off"
          placeholder="Sat–Thu, 10am–7pm"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className={field}
        />
        <span className="text-xs text-gray-500">{t("admin.support.hoursHint")}</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.common.save")}
      </button>
    </form>
  );
}
