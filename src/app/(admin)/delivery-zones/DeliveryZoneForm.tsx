"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { DeliveryZoneState } from "./actions";

const initialState: DeliveryZoneState = {};

type DeliveryZoneFormProps = {
  action: (prevState: DeliveryZoneState, formData: FormData) => Promise<DeliveryZoneState>;
  title: string;
  submitLabel: string;
  initialValues?: { name: string; charge: string };
  // Create stays on the same page after success (clear the fields so the
  // merchant can add another) — edit redirects away on success server-side
  // (see updateDeliveryZone), so there's nothing to clear.
  clearOnSuccess?: boolean;
};

export function DeliveryZoneForm({
  action,
  title,
  submitLabel,
  initialValues,
  clearOnSuccess,
}: DeliveryZoneFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const t = useTranslator();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [charge, setCharge] = useState(initialValues?.charge ?? "");

  // Same pattern as CreateCategoryForm.tsx — clear fields only once `ok`
  // actually confirms success, adjusted during render rather than an
  // effect (see that file's comment for why).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok && clearOnSuccess) {
      setName("");
      setCharge("");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">{title}</h2>
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <label className="flex flex-col gap-1">
        {t("admin.deliveryZones.zoneName")}
        <input
          name="name"
          required
          placeholder={t("admin.deliveryZones.zoneNamePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        {t("admin.deliveryZones.deliveryCharge")}
        <input
          name="charge"
          type="number"
          step="0.01"
          min="0"
          required
          value={charge}
          onChange={(e) => setCharge(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : submitLabel}
      </button>
    </form>
  );
}
