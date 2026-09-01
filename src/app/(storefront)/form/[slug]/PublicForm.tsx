"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { FormField } from "@/db/schema";
import { parseOptions, type FormFieldType } from "@/lib/forms/types";
import { fieldInputName, HONEYPOT_FIELD } from "@/lib/forms/validate";
import { submitForm, type SubmitFormState } from "./actions";

const initialState: SubmitFormState = {};

const INPUT_TYPE: Partial<Record<FormFieldType, string>> = {
  text: "text",
  email: "email",
  phone: "tel",
  number: "number",
  date: "date",
};

export function PublicForm({
  slug,
  fields,
  successMessage,
}: {
  slug: string;
  fields: FormField[];
  successMessage: string | null;
}) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(
    submitForm.bind(null, slug),
    initialState
  );

  if (state.ok) {
    return (
      <p className="rounded border border-green-400 bg-green-50 px-4 py-3 text-sm text-green-800">
        {successMessage || t("forms.successDefault")}
      </p>
    );
  }

  const cls = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error.key, state.error.vars)}
        </p>
      )}

      {/* honeypot — offscreen, not for humans */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      {fields.map((field) => {
        const type = field.type as FormFieldType;
        const name = fieldInputName(field.id);
        const err = state.fieldErrors?.[field.id];
        const options = parseOptions(field.options);

        return (
          <div key={field.id} className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor={name}>
              {field.label}
              {field.required && <span className="text-red-600"> *</span>}
            </label>

            {type === "textarea" ? (
              <textarea
                id={name}
                name={name}
                rows={4}
                required={field.required}
                placeholder={field.placeholder ?? undefined}
                className={cls}
              />
            ) : type === "dropdown" ? (
              <select id={name} name={name} required={field.required} className={cls} defaultValue="">
                <option value="" disabled>
                  {field.placeholder || "—"}
                </option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : type === "radio" ? (
              <div className="flex flex-col gap-1">
                {options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={name} value={opt} required={field.required} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : type === "checkbox" ? (
              <div className="flex flex-col gap-1">
                {options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={name} value={opt} />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <input
                id={name}
                name={name}
                type={INPUT_TYPE[type] ?? "text"}
                required={field.required}
                placeholder={field.placeholder ?? undefined}
                className={cls}
              />
            )}

            {err && <p className="text-xs text-red-700">{t(err)}</p>}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-5 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("forms.submitting") : t("forms.submit")}
      </button>
    </form>
  );
}
