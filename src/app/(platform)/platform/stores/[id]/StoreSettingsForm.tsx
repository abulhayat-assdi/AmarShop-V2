"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { updateStoreSettingsAction, type StoreSettingsState } from "@/lib/platform/actions";

const initial: StoreSettingsState = {};

type Initial = {
  name: string;
  slug: string;
  locale: string;
  lowStockThreshold: number;
  digitalEnabled: boolean;
  metaPixelId: string;
  ga4MeasurementId: string;
};

export function StoreSettingsForm({ storeId, initial: v }: { storeId: string; initial: Initial }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(
    updateStoreSettingsAction.bind(null, storeId),
    initial
  );

  const [name, setName] = useState(v.name);
  const [slug, setSlug] = useState(v.slug);
  const [locale, setLocale] = useState(v.locale);
  const [threshold, setThreshold] = useState(String(v.lowStockThreshold));
  const [digital, setDigital] = useState(v.digitalEnabled);
  const [pixel, setPixel] = useState(v.metaPixelId);
  const [ga4, setGa4] = useState(v.ga4MeasurementId);

  const input = "rounded border border-gray-300 px-3 py-2 text-sm";

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error.key, state.error.vars)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("platform.settings.saved")}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("platform.settings.name")}
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.settings.slug")}
        <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.settings.locale")}
        <select name="locale" value={locale} onChange={(e) => setLocale(e.target.value)} className={input}>
          <option value="bn">বাংলা</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.settings.lowStock")}
        <input
          type="number"
          name="lowStockThreshold"
          min={0}
          max={100000}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className={input}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="digitalEnabled"
          checked={digital}
          onChange={(e) => setDigital(e.target.checked)}
        />
        {t("platform.settings.digital")}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.settings.metaPixel")}
        <input
          name="metaPixelId"
          value={pixel}
          onChange={(e) => setPixel(e.target.value)}
          autoComplete="off"
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.settings.ga4")}
        <input
          name="ga4MeasurementId"
          value={ga4}
          onChange={(e) => setGa4(e.target.value)}
          autoComplete="off"
          placeholder="G-XXXXXXX"
          className={input}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("platform.settings.saving") : t("platform.settings.save")}
      </button>
    </form>
  );
}
