"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { Redirect } from "@/db/schema";
import { REDIRECT_STATUS_CODES } from "@/lib/redirects/normalize";
import { deleteRedirectAction, updateRedirectAction, type RedirectState } from "./actions";

const initialState: RedirectState = {};

export function RedirectRow({ redirect }: { redirect: Redirect }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(
    updateRedirectAction.bind(null, redirect.id),
    initialState
  );
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const field = "rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-gray-500">{t("admin.redirects.fromLabel")}</span>
          <input name="fromPath" defaultValue={redirect.fromPath} required className={`${field} font-mono`} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-gray-500">{t("admin.redirects.toLabel")}</span>
          <input name="toTarget" defaultValue={redirect.toTarget} required className={`${field} font-mono`} />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-xs text-gray-500">{t("admin.redirects.typeLabel")}</span>
          <select name="statusCode" defaultValue={redirect.statusCode} className={field}>
            {REDIRECT_STATUS_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`admin.redirects.type${code}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={redirect.active} />
          {t("admin.redirects.active")}
        </label>
        <button type="submit" disabled={isPending} className="underline disabled:opacity-50">
          {t("admin.common.save")}
        </button>
        {confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-gray-600">{t("admin.redirects.deleteQ")}</span>
            <button
              type="button"
              onClick={() => startTransition(() => deleteRedirectAction(redirect.id))}
              className="text-red-600 underline"
            >
              {t("admin.common.delete")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="underline">
              {t("admin.common.cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-red-600 underline"
          >
            {t("admin.common.delete")}
          </button>
        )}
      </div>

      {state.error && <p className="text-xs text-red-700">{t(state.error)}</p>}
    </form>
  );
}
