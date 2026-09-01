"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { FormField } from "@/db/schema";
import {
  FORM_FIELD_TYPES,
  fieldTypeHasOptions,
  fieldTypeLabelKey,
  type FormFieldType,
} from "@/lib/forms/types";
import { deleteFieldAction, updateFieldAction, type FormActionState } from "../../actions";

const initialState: FormActionState = {};

export function FieldRow({ formId, field }: { formId: string; field: FormField }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(
    updateFieldAction.bind(null, formId, field.id),
    initialState
  );
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [type, setType] = useState<FormFieldType>(field.type as FormFieldType);
  const cls = "rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border px-3 py-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t("admin.forms.fieldFieldType")}</span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as FormFieldType)}
            className={cls}
          >
            {FORM_FIELD_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {t(fieldTypeLabelKey(ft))}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-gray-500">{t("admin.forms.fieldFieldLabel")}</span>
          <input name="label" defaultValue={field.label} required className={cls} />
        </label>

        <label className="flex w-16 flex-col gap-1">
          <span className="text-xs text-gray-500">{t("admin.forms.fieldOrder")}</span>
          <input
            name="displayOrder"
            type="number"
            defaultValue={field.displayOrder}
            className={cls}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{t("admin.forms.fieldPlaceholder")}</span>
        <input name="placeholder" defaultValue={field.placeholder ?? ""} className={cls} />
      </label>

      {fieldTypeHasOptions(type) && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t("admin.forms.fieldOptions")}</span>
          <textarea
            name="options"
            defaultValue={field.options ?? ""}
            rows={3}
            placeholder={t("admin.forms.optionsHint")}
            className={cls}
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="required" defaultChecked={field.required} />
          {t("admin.forms.fieldRequired")}
        </label>
        <button type="submit" disabled={isPending} className="underline disabled:opacity-50">
          {t("admin.common.save")}
        </button>
        {confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-gray-600">{t("admin.forms.deleteFieldQ")}</span>
            <button
              type="button"
              onClick={() => startTransition(() => deleteFieldAction(formId, field.id))}
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
