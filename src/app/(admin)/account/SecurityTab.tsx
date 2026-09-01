"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { updatePasswordAction, type AccountState } from "./actions";

const initialState: AccountState = {};

export function SecurityTab() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState);
  const t = useTranslator();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <div className="flex max-w-md flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3">
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
          {t("admin.account.currentPassword")}
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("admin.account.newPassword")}
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("admin.account.confirmPassword")}
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={field}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("admin.common.saving") : t("admin.common.save")}
        </button>
      </form>

      <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        {t("admin.account.security.notBuiltYet")}
      </p>
    </div>
  );
}
