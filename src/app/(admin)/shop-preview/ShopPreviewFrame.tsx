"use client";

import { useState } from "react";
import { useTranslator } from "@/components/i18n-provider";

// The real, live storefront in an iframe — deliberately not a separate
// rendering path (SITE_STRUCTURE.md's own audited bug: a "preview" tool
// that shows something other than the actual storefront, or a stale
// onboarding screen instead of it). Widths are just a CSS max-width on
// the same iframe pointed at the same URL.
const VIEWPORTS = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;
type Viewport = keyof typeof VIEWPORTS;

export function ShopPreviewFrame({ url }: { url: string }) {
  const t = useTranslator();
  const [viewport, setViewport] = useState<Viewport>("desktop");

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {(Object.keys(VIEWPORTS) as Viewport[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewport(v)}
              className={`rounded border px-3 py-1 text-sm ${
                viewport === v ? "border-black bg-black text-white" : "border-gray-300"
              }`}
            >
              {t(`admin.shopPreview.${v}`)}
            </button>
          ))}
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
          {t("admin.shell.viewStore")} ↗
        </a>
      </div>
      <div className="flex-1 overflow-auto rounded border bg-gray-100 p-4">
        <iframe
          src={url}
          title={t("admin.shopPreview.title")}
          className="mx-auto h-[80vh] max-w-full rounded border bg-white"
          style={{ width: VIEWPORTS[viewport] }}
        />
      </div>
    </div>
  );
}
