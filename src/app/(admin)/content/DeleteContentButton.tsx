"use client";

import { useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { deleteContent } from "./actions";

// Inline two-step confirm, no native confirm() (CLAUDE.md).
export function DeleteContentButton({ entryId }: { entryId: string }) {
  const t = useTranslator();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">{t("admin.content.deleteQ")}</span>
        <form action={deleteContent.bind(null, entryId)}>
          <button type="submit" className="text-red-600 underline">
            {t("admin.content.confirm")}
          </button>
        </form>
        <button type="button" onClick={() => setConfirming(false)} className="underline">
          {t("admin.content.cancel")}
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
      {t("admin.content.delete")}
    </button>
  );
}
