"use client";

import { useState, useTransition } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { deleteFormAction } from "./actions";

// Inline two-step confirm, no native confirm() (CLAUDE.md). Deleting a
// form also removes its fields and every submission — the copy says so.
export function DeleteFormButton({ formId }: { formId: string }) {
  const t = useTranslator();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="flex items-center gap-3 text-sm">
        <span className="text-gray-600">{t("admin.forms.deleteFormQ")}</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteFormAction(formId))}
          className="text-red-600 underline disabled:opacity-50"
        >
          {t("admin.common.delete")}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="underline">
          {t("admin.common.cancel")}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="self-start text-sm text-red-600 underline"
    >
      {t("admin.forms.deleteForm")}
    </button>
  );
}
