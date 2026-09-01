"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { addMenuItemAction, type MenuItemState } from "./actions";

const initialState: MenuItemState = {};

export function AddMenuItemForm({
  pages,
  categories,
}: {
  pages: { id: string; title: string }[];
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(addMenuItemAction, initialState);
  const t = useTranslator();
  const [kind, setKind] = useState<"custom_link" | "page" | "category">("custom_link");
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
        {t("admin.menuBuilder.label")}
        <input name="label" required value={label} onChange={(e) => setLabel(e.target.value)} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.menuBuilder.kind")}
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className={field}
        >
          <option value="custom_link">{t("admin.menuBuilder.kindCustomLink")}</option>
          <option value="page">{t("admin.menuBuilder.kindPage")}</option>
          <option value="category">{t("admin.menuBuilder.kindCategory")}</option>
        </select>
      </label>

      {kind === "custom_link" && (
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.menuBuilder.url")}
          <input name="url" placeholder="/category/shirts or https://…" className={field} />
        </label>
      )}
      {kind === "page" && (
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.menuBuilder.target")}
          <select name="contentEntryId" required={kind === "page"} className={field}>
            <option value="" />
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === "category" && (
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.menuBuilder.target")}
          <select name="categoryId" required={kind === "category"} className={field}>
            <option value="" />
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.menuBuilder.order")}
        <input name="displayOrder" type="number" defaultValue={0} className={`${field} w-20`} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.menuBuilder.add")}
      </button>
    </form>
  );
}
