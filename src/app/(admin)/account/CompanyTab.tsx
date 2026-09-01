"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { updateCompanyAction, type AccountState } from "./store-settings-actions";

const initialState: AccountState = {};

export function CompanyTab({
  name,
  businessAddress,
  timezone,
  currency,
}: {
  name: string;
  businessAddress: string | null;
  timezone: string;
  currency: string;
}) {
  const [state, formAction, isPending] = useActionState(updateCompanyAction, initialState);
  const t = useTranslator();
  const [nameValue, setNameValue] = useState(name);
  const [address, setAddress] = useState(businessAddress ?? "");

  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.account.saved")}
        </p>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.account.company.name")}
        <input
          name="name"
          required
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.account.company.address")}
        <textarea
          name="businessAddress"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.account.company.timezone")}
        <input name="timezone" defaultValue={timezone} className={field} />
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.account.company.currency")}
        <input name="currency" defaultValue={currency} maxLength={3} className={field} />
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
