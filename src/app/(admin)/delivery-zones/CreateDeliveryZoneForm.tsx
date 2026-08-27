"use client";

import { useActionState, useState } from "react";
import { createDeliveryZone, type CreateDeliveryZoneState } from "./actions";

const initialState: CreateDeliveryZoneState = {};

export function CreateDeliveryZoneForm() {
  const [state, formAction, isPending] = useActionState(createDeliveryZone, initialState);
  const [name, setName] = useState("");
  const [charge, setCharge] = useState("");

  // Same pattern as CreateCategoryForm.tsx — clear fields only once `ok`
  // actually confirms success, adjusted during render rather than an
  // effect (see that file's comment for why).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setName("");
      setCharge("");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">Add delivery zone</h2>
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <label className="flex flex-col gap-1">
        Zone name
        <input
          name="name"
          required
          placeholder="e.g. Inside Dhaka"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Delivery charge (৳)
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
        {isPending ? "Adding…" : "Add zone"}
      </button>
    </form>
  );
}
