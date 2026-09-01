"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { CheckoutCustomField } from "@/db/schema";
import { deleteCheckoutFieldAction, updateCheckoutFieldAction, type CheckoutFieldState } from "./actions";

const initialState: CheckoutFieldState = {};

export function CheckoutFieldRow({ field }: { field: CheckoutCustomField }) {
  const [state, formAction, isPending] = useActionState(
    updateCheckoutFieldAction.bind(null, field.id),
    initialState
  );
  const t = useTranslator();
  const [label, setLabel] = useState(field.label);
  const [order, setOrder] = useState(field.displayOrder);
  const [required, setRequired] = useState(field.required);
  const [active, setActive] = useState(field.active);

  const inputCls = "rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 rounded border px-3 py-2 text-sm">
      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
        {field.fieldType === "textarea"
          ? t("admin.checkoutSettings.fieldTypeTextarea")
          : t("admin.checkoutSettings.fieldTypeText")}
      </span>
      <input name="label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
      <input
        name="displayOrder"
        type="number"
        value={order}
        onChange={(e) => setOrder(Number(e.target.value))}
        className={`${inputCls} w-16`}
      />
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          name="required"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        {t("admin.checkoutSettings.required")}
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
        {t("admin.checkoutSettings.active")}
      </label>
      <button type="submit" disabled={isPending} className="underline disabled:opacity-50">
        {t("admin.common.save")}
      </button>
      <button
        type="button"
        onClick={() => deleteCheckoutFieldAction(field.id)}
        className="text-red-600 underline"
      >
        {t("admin.common.delete")}
      </button>
      {state.error && <span className="w-full text-xs text-red-700">{t(state.error)}</span>}
    </form>
  );
}
