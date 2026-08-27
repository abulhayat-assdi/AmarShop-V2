"use client";

import { useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { deleteDeliveryZone } from "./actions";

// Inline two-step confirm instead of a native confirm() popup — CLAUDE.md
// flags browser confirm() as inconsistent UI and a real risk for automated
// tooling. No custom modal system exists yet to justify building one for
// this single button, so this stays a small, self-contained component.
export function DeleteZoneButton({ zoneId }: { zoneId: string }) {
  const t = useTranslator();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">{t("admin.deliveryZones.deleteQ")}</span>
        <form action={deleteDeliveryZone.bind(null, zoneId)}>
          <button type="submit" className="text-red-600 underline">
            {t("admin.deliveryZones.confirm")}
          </button>
        </form>
        <button type="button" onClick={() => setConfirming(false)} className="underline">
          {t("admin.deliveryZones.cancel")}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm text-red-600 underline"
    >
      {t("admin.deliveryZones.delete")}
    </button>
  );
}
