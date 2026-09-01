"use client";

import { useActionState, useRef } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { REDIRECT_STATUS_CODES } from "@/lib/redirects/normalize";
import { addRedirectAction, type RedirectState } from "./actions";

const initialState: RedirectState = {};

export function AddRedirectForm() {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(addRedirectAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const field = "rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <form
      ref={formRef}
      action={(fd) => {
        formAction(fd);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          {t("admin.redirects.fromLabel")}
          <input name="fromPath" required placeholder="/old-page" className={`${field} font-mono`} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          {t("admin.redirects.toLabel")}
          <input
            name="toTarget"
            required
            placeholder="/new-page"
            className={`${field} font-mono`}
          />
        </label>
        <label className="flex w-28 flex-col gap-1 text-sm">
          {t("admin.redirects.typeLabel")}
          <select name="statusCode" defaultValue={301} className={field}>
            {REDIRECT_STATUS_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`admin.redirects.type${code}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked />
        {t("admin.redirects.active")}
      </label>

      <span className="text-xs text-gray-500">{t("admin.redirects.hint")}</span>

      {state.error && <p className="text-xs text-red-700">{t(state.error)}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {t("admin.redirects.add")}
      </button>
    </form>
  );
}
