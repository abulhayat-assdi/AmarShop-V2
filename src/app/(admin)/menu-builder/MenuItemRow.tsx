"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { NavMenuItem } from "@/db/schema";
import { deleteMenuItemAction, updateMenuItemAction, type MenuItemState } from "./actions";

const initialState: MenuItemState = {};

const KIND_LABEL_KEYS = {
  custom_link: "admin.menuBuilder.kindCustomLink",
  page: "admin.menuBuilder.kindPage",
  category: "admin.menuBuilder.kindCategory",
} as const;

export function MenuItemRow({ item }: { item: NavMenuItem }) {
  const [state, formAction, isPending] = useActionState(
    updateMenuItemAction.bind(null, item.id),
    initialState
  );
  const t = useTranslator();
  const [label, setLabel] = useState(item.label);
  const [order, setOrder] = useState(item.displayOrder);
  const [visible, setVisible] = useState(item.visible);
  const [openInNewTab, setOpenInNewTab] = useState(item.openInNewTab);

  const field = "rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 rounded border px-3 py-2 text-sm">
      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
        {t(KIND_LABEL_KEYS[item.kind])}
      </span>
      <input name="label" value={label} onChange={(e) => setLabel(e.target.value)} className={field} />
      <input
        name="displayOrder"
        type="number"
        value={order}
        onChange={(e) => setOrder(Number(e.target.value))}
        className={`${field} w-16`}
      />
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          name="visible"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
        {t("admin.menuBuilder.visible")}
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          name="openInNewTab"
          checked={openInNewTab}
          onChange={(e) => setOpenInNewTab(e.target.checked)}
        />
        {t("admin.menuBuilder.newTab")}
      </label>
      <button type="submit" disabled={isPending} className="underline disabled:opacity-50">
        {t("admin.common.save")}
      </button>
      <button
        type="button"
        onClick={() => deleteMenuItemAction(item.id)}
        className="text-red-600 underline"
      >
        {t("admin.common.delete")}
      </button>
      {state.error && <span className="w-full text-xs text-red-700">{t(state.error)}</span>}
    </form>
  );
}
