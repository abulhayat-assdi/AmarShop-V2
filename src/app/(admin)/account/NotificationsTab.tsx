"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { updateNotificationsAction, type AccountState } from "./actions";

const initialState: AccountState = {};

export function NotificationsTab({ notifyBillingNotices }: { notifyBillingNotices: boolean }) {
  const [state, formAction, isPending] = useActionState(updateNotificationsAction, initialState);
  const t = useTranslator();
  const [checked, setChecked] = useState(notifyBillingNotices);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.account.saved")}
        </p>
      )}

      <p className="text-sm text-gray-600">{t("admin.account.notifications.intro")}</p>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="notifyBillingNotices"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-medium">{t("admin.account.notifications.billing")}</span>
          <span className="block text-xs text-gray-500">
            {t("admin.account.notifications.billingHint")}
          </span>
        </span>
      </label>

      <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        {t("admin.account.notifications.notBuiltYet")}
      </p>

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
