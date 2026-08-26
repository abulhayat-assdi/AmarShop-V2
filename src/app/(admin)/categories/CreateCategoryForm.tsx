"use client";

import { useActionState, useState } from "react";
import { createCategory, type CreateCategoryState } from "./actions";

const initialState: CreateCategoryState = {};

export function CreateCategoryForm() {
  const [state, formAction, isPending] = useActionState(createCategory, initialState);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Controlled inputs survive React's post-action form reset either way
  // (see CreateStoreForm.tsx) — but here, unlike store creation, a
  // successful submit stays on the same page, so we also want to clear the
  // fields ourselves once `state.ok` confirms it actually succeeded (not on
  // every completion, which would wipe the fields on a validation error too).
  // Adjusting state during render (React's documented pattern for "reset
  // when a signal changes") rather than in a useEffect, which would cause
  // an extra render pass.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setName("");
      setDescription("");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">Add category</h2>
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <label className="flex flex-col gap-1">
        Name
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Description (optional)
        <input
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}
