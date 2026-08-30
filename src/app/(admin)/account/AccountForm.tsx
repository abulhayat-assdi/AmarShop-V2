"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { updateAccountAction, type AccountState } from "./actions";

const initialState: AccountState = {};

export function AccountForm({ name, email, roleLabel }: { name: string; email: string; roleLabel: string }) {
  const [state, formAction, isPending] = useActionState(updateAccountAction, initialState);
  const t = useTranslator();
  const [nameValue, setNameValue] = useState(name);
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
        {t("admin.account.name")}
        <input
          name="name"
          required
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          className={field}
        />
      </label>

      <div className="text-sm text-gray-500">
        {email} · {roleLabel}
      </div>

      <hr className="my-2" />

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
        {isPending ? t("admin.common.saving") : t("admin.account.save")}
      </button>
    </form>
  );
}
