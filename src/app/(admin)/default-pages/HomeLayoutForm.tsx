"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { updateHomeLayoutAction, type DefaultPagesState } from "./actions";

const initialState: DefaultPagesState = {};

export function HomeLayoutForm({
  homeShowCategories,
  homeCategoriesOrder,
  homeShowNewArrivals,
  homeNewArrivalsOrder,
}: {
  homeShowCategories: boolean;
  homeCategoriesOrder: number;
  homeShowNewArrivals: boolean;
  homeNewArrivalsOrder: number;
}) {
  const [state, formAction, isPending] = useActionState(updateHomeLayoutAction, initialState);
  const t = useTranslator();
  const [showCategories, setShowCategories] = useState(homeShowCategories);
  const [categoriesOrder, setCategoriesOrder] = useState(homeCategoriesOrder);
  const [showNewArrivals, setShowNewArrivals] = useState(homeShowNewArrivals);
  const [newArrivalsOrder, setNewArrivalsOrder] = useState(homeNewArrivalsOrder);

  const rowCls = "flex items-center justify-between gap-3 rounded border px-4 py-3";
  const orderField = "w-16 rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.defaultPages.saved")}
        </p>
      )}

      <div className={rowCls}>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="homeShowCategories"
            checked={showCategories}
            onChange={(e) => setShowCategories(e.target.checked)}
          />
          {t("admin.defaultPages.categories")}
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          {t("admin.defaultPages.order")}
          <input
            name="homeCategoriesOrder"
            type="number"
            value={categoriesOrder}
            onChange={(e) => setCategoriesOrder(Number(e.target.value))}
            className={orderField}
          />
        </label>
      </div>

      <div className={rowCls}>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="homeShowNewArrivals"
            checked={showNewArrivals}
            onChange={(e) => setShowNewArrivals(e.target.checked)}
          />
          {t("admin.defaultPages.newArrivals")}
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          {t("admin.defaultPages.order")}
          <input
            name="homeNewArrivalsOrder"
            type="number"
            value={newArrivalsOrder}
            onChange={(e) => setNewArrivalsOrder(Number(e.target.value))}
            className={orderField}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.common.save")}
      </button>
    </form>
  );
}
