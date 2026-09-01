"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { updateProfileAction, type AccountState } from "./actions";

const initialState: AccountState = {};

export function ProfileTab({
  name,
  email,
  phone,
  bio,
  roleLabel,
}: {
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  roleLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);
  const t = useTranslator();
  const [nameValue, setNameValue] = useState(name);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [bioValue, setBioValue] = useState(bio ?? "");

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

      <label className="flex flex-col gap-1">
        {t("admin.account.profile.phone")}
        <input
          name="phone"
          autoComplete="off"
          placeholder="01XXXXXXXXX"
          value={phoneValue}
          onChange={(e) => setPhoneValue(e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.account.profile.bio")}
        <textarea
          name="bio"
          rows={3}
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          className={field}
        />
      </label>
      <p className="text-xs text-gray-500">{t("admin.account.profile.avatarNote")}</p>

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
