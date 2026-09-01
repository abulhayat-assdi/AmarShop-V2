"use client";

import { useState } from "react";
import { useTranslator } from "@/components/i18n-provider";

// The homepage feature showcase (SITE_STRUCTURE.md Part A section 5). A
// plain tab layout — NOT a scroll-jacked / IntersectionObserver carousel
// (CLAUDE.md rule #6; the audit found one of ten cards unreachable in the
// competitor's scroll-driven version). Keys map to
// marketing.home.showcase.<key>.{title,desc,b1,b2,b3}.
const TABS = [
  "writer",
  "storefront",
  "orders",
  "payments",
  "courier",
  "invoices",
  "analytics",
  "digital",
] as const;

export function FeatureTabs() {
  const t = useTranslator();
  const [active, setActive] = useState<(typeof TABS)[number]>("writer");
  const base = `marketing.home.showcase.${active}`;

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={active === key}
            onClick={() => setActive(key)}
            className={`shrink-0 rounded-md px-3 py-2 text-left text-sm ${
              active === key
                ? "bg-black text-white"
                : "border border-gray-200 text-gray-600 hover:border-gray-400 md:border-transparent"
            }`}
          >
            {t(`marketing.home.showcase.${key}.title`)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold">{t(`${base}.title`)}</h3>
        <p className="mt-2 text-gray-600">{t(`${base}.desc`)}</p>
        <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-700">
          <li>✓ {t(`${base}.b1`)}</li>
          <li>✓ {t(`${base}.b2`)}</li>
          <li>✓ {t(`${base}.b3`)}</li>
        </ul>
        <div className="mt-6 h-40 rounded-lg border border-dashed border-gray-300 bg-gray-50" aria-hidden />
      </div>
    </div>
  );
}
