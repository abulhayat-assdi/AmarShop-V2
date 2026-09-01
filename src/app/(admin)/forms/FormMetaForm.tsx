"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { FormActionState } from "./actions";

const initialState: FormActionState = {};

export type FormMetaValues = {
  title: string;
  slug: string;
  description: string;
  successMessage: string;
  status: "draft" | "published";
};

export function FormMetaForm({
  action,
  submitLabel,
  initialValues,
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  submitLabel: string;
  initialValues?: FormMetaValues;
}) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const field = "rounded border border-gray-300 px-3 py-2 text-sm";

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.forms.saved")}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.forms.fieldTitle")}
        <input name="title" defaultValue={initialValues?.title ?? ""} required className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.forms.fieldSlug")}
        <input
          name="slug"
          defaultValue={initialValues?.slug ?? ""}
          placeholder={t("admin.forms.slugHint")}
          className={`${field} font-mono`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.forms.fieldDescription")}
        <textarea
          name="description"
          defaultValue={initialValues?.description ?? ""}
          rows={2}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.forms.fieldSuccessMessage")}
        <textarea
          name="successMessage"
          defaultValue={initialValues?.successMessage ?? ""}
          rows={2}
          placeholder={t("admin.forms.successMessageHint")}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.forms.fieldStatus")}
        <select
          name="status"
          defaultValue={initialValues?.status ?? "draft"}
          className={field}
        >
          <option value="draft">{t("admin.forms.statusDraft")}</option>
          <option value="published">{t("admin.forms.statusPublished")}</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : submitLabel}
      </button>
    </form>
  );
}
