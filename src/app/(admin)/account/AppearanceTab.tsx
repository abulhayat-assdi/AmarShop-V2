"use client";

import { useSyncExternalStore } from "react";
import { useTranslator } from "@/components/i18n-provider";
import {
  FONT_SCALES,
  fontScaleServerSnapshot,
  fontScaleSnapshot,
  setFontScale,
  subscribeFontScale,
} from "@/lib/appearance/font-scale";

// Personal, per-browser preference — no DB column. Genuinely implemented:
// a CSS custom property applied sitewide (admin-shell.tsx applies it on
// every admin page, not just this one), not a fake toggle. A full
// color-scheme/border-radius theme (SITE_STRUCTURE.md's fuller Appearance
// spec) would mean adding dark: variants across every existing admin
// page — out of scope for this slice, flagged below rather than faked.
export function AppearanceTab() {
  const t = useTranslator();
  const scale = useSyncExternalStore(subscribeFontScale, fontScaleSnapshot, fontScaleServerSnapshot);

  return (
    <div className="flex max-w-md flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("admin.account.appearance.fontSizeLabel")}</legend>
        {FONT_SCALES.map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="fontScale"
              checked={scale === s}
              onChange={() => setFontScale(s)}
            />
            {t(`admin.account.appearance.fontSize.${s}`)}
          </label>
        ))}
        <p className="text-xs text-gray-500">{t("admin.account.appearance.fontSizeHint")}</p>
      </fieldset>

      <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        {t("admin.account.appearance.notBuiltYet")}
      </p>
    </div>
  );
}
