"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { addCheckoutFieldAction, type CheckoutFieldState } from "./actions";

const initialState: CheckoutFieldState = {};

export function AddCheckoutFieldForm() {
  const [state, formAction, isPending] = useActionState(addCheckoutFieldAction, initialState);
  const t = useTranslator();
  const [label, setLabel] = useState("");

  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-4">
      {state.error && (
        <p className="w-full rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.checkoutSettings.label")}
        <input name="label" required value={label} onChange={(e) => setLabel(e.target.value)} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.checkoutSettings.fieldType")}
        <select name="fieldType" defaultValue="text" className={field}>
          <option value="text">{t("admin.checkoutSettings.fieldTypeText")}</option>
          <option value="textarea">{t("admin.checkoutSettings.fieldTypeTextarea")}</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" />
        {t("admin.checkoutSettings.required")}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.checkoutSettings.order")}
        <input name="displayOrder" type="number" defaultValue={0} className={`${field} w-20`} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.checkoutSettings.add")}
      </button>
    </form>
  );
}
