"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import {
  confirmImportAction,
  previewImportAction,
  type ConfirmState,
  type PreviewState,
} from "./actions";

const previewInitial: PreviewState = {};
const confirmInitial: ConfirmState = {};

export function ImportForm() {
  const t = useTranslator();
  const [preview, previewAction, previewing] = useActionState(previewImportAction, previewInitial);
  const [confirm, confirmAction, confirming] = useActionState(confirmImportAction, confirmInitial);

  return (
    <div className="flex flex-col gap-6">
      <form action={previewAction} className="flex flex-col items-start gap-3 rounded border p-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.import.fileLabel")}
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="text-sm"
          />
        </label>
        {preview.headerError && (
          <p className="text-sm text-red-700">
            {t(preview.headerError.key, preview.headerError.vars)}
          </p>
        )}
        <button
          type="submit"
          disabled={previewing}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {previewing ? t("admin.import.previewing") : t("admin.import.preview")}
        </button>
      </form>

      {preview.rows && preview.summary && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {t("admin.import.summary", {
              willImport: preview.summary.willImport,
              skipped: preview.summary.skipped,
            })}
            {preview.summary.newCategories.length > 0 && (
              <>
                {" "}
                {t("admin.import.summaryNewCategories", {
                  list: preview.summary.newCategories.join(", "),
                })}
              </>
            )}
          </p>

          <div className="max-h-96 overflow-auto rounded border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="px-2 py-1">{t("admin.import.colLine")}</th>
                  <th className="px-2 py-1">{t("admin.import.colName")}</th>
                  <th className="px-2 py-1">{t("admin.import.colSku")}</th>
                  <th className="px-2 py-1">{t("admin.import.colPrice")}</th>
                  <th className="px-2 py-1">{t("admin.import.colCategory")}</th>
                  <th className="px-2 py-1">{t("admin.import.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.line} className="border-b last:border-0">
                    <td className="px-2 py-1 text-gray-400">{row.line}</td>
                    <td className="px-2 py-1">{row.name || "—"}</td>
                    <td className="px-2 py-1 font-mono">{row.sku || "—"}</td>
                    <td className="px-2 py-1">{row.price || "—"}</td>
                    <td className="px-2 py-1">
                      {row.category ?? "—"}
                      {row.newCategory && (
                        <span className="ml-1 text-green-700">
                          {t("admin.import.newCategoryTag")}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      {row.status === "ok" ? (
                        <span className="text-green-700">{t("admin.import.willImportTag")}</span>
                      ) : (
                        <span className="text-red-700">
                          {row.reason ? t(row.reason.key, row.reason.vars) : t("admin.import.skippedTag")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={confirmAction}>
            <input type="hidden" name="csv" value={preview.rawCsv ?? ""} />
            {confirm.error && (
              <p className="mb-2 text-sm text-red-700">
                {t(confirm.error.key, confirm.error.vars)}
              </p>
            )}
            <button
              type="submit"
              disabled={confirming || preview.summary.willImport === 0}
              className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {confirming
                ? t("admin.import.importing")
                : t("admin.import.importN", { count: preview.summary.willImport })}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
