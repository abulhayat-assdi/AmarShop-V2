"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { saveMarketingSettingsAction, type MarketingState } from "./actions";

const initialState: MarketingState = {};

export function MarketingSettingsForm({
  metaPixelId,
  ga4MeasurementId,
}: {
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(saveMarketingSettingsAction, initialState);
  const t = useTranslator();
  const [pixel, setPixel] = useState(metaPixelId ?? "");
  const [ga4, setGa4] = useState(ga4MeasurementId ?? "");

  const field = "rounded border border-gray-300 px-3 py-2 font-mono";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.marketing.saved")}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.marketing.pixelLabel")}
        <input
          type="text"
          name="metaPixelId"
          autoComplete="off"
          placeholder="123456789012"
          value={pixel}
          onChange={(e) => setPixel(e.target.value)}
          className={field}
        />
        <span className="text-xs text-gray-500">{t("admin.marketing.pixelHint")}</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.marketing.ga4Label")}
        <input
          type="text"
          name="ga4MeasurementId"
          autoComplete="off"
          placeholder="G-XXXXXXXXXX"
          value={ga4}
          onChange={(e) => setGa4(e.target.value)}
          className={field}
        />
        <span className="text-xs text-gray-500">{t("admin.marketing.ga4Hint")}</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.marketing.save")}
      </button>
    </form>
  );
}
