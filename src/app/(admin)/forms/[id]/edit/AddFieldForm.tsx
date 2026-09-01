"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import {
  FORM_FIELD_TYPES,
  fieldTypeHasOptions,
  fieldTypeLabelKey,
  type FormFieldType,
} from "@/lib/forms/types";
import { addFieldAction, type FormActionState } from "../../actions";

const initialState: FormActionState = {};

export function AddFieldForm({ formId }: { formId: string }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(
    addFieldAction.bind(null, formId),
    initialState
  );
  const [type, setType] = useState<FormFieldType>("text");
  const formRef = useRef<HTMLFormElement>(null);
  const field = "rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <form
      ref={formRef}
      action={(fd) => {
        formAction(fd);
        formRef.current?.reset();
        setType("text");
      }}
      className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.forms.fieldFieldType")}
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as FormFieldType)}
            className={field}
          >
            {FORM_FIELD_TYPES.map((ft) => (
              <option key={ft} value={ft}>
                {t(fieldTypeLabelKey(ft))}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
          {t("admin.forms.fieldFieldLabel")}
          <input name="label" required className={field} />
        </label>

        <label className="flex w-20 flex-col gap-1 text-sm">
          {t("admin.forms.fieldOrder")}
          <input name="displayOrder" type="number" defaultValue={0} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.forms.fieldPlaceholder")}
        <input name="placeholder" className={field} />
      </label>

      {fieldTypeHasOptions(type) && (
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.forms.fieldOptions")}
          <textarea
            name="options"
            rows={3}
            placeholder={t("admin.forms.optionsHint")}
            className={field}
          />
        </label>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" />
        {t("admin.forms.fieldRequired")}
      </label>

      {state.error && <p className="text-xs text-red-700">{t(state.error)}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {t("admin.forms.addFieldSubmit")}
      </button>
    </form>
  );
}
