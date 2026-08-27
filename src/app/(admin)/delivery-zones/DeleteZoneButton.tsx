"use client";

import { useState } from "react";
import { deleteDeliveryZone } from "./actions";

// Inline two-step confirm instead of a native confirm() popup — CLAUDE.md
// flags browser confirm() as inconsistent UI and a real risk for automated
// tooling. No custom modal system exists yet to justify building one for
// this single button, so this stays a small, self-contained component.
export function DeleteZoneButton({ zoneId }: { zoneId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Delete?</span>
        <form action={deleteDeliveryZone.bind(null, zoneId)}>
          <button type="submit" className="text-red-600 underline">
            Confirm
          </button>
        </form>
        <button type="button" onClick={() => setConfirming(false)} className="underline">
          Cancel
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
      Delete
    </button>
  );
}
