"use client";

import { useActionState, useState } from "react";
import { createStore, type CreateStoreField, type CreateStoreState } from "./actions";

const initialState: CreateStoreState = {};

// React resets a <form>'s fields after its action completes, even when the
// action returns a handled error rather than throwing — there's no "this
// was an error, don't reset" signal at that level. Keeping every field
// controlled (its value driven by our own state, not the DOM) is what
// actually survives that reset, since React re-applies our state on the
// next render regardless of what the native reset just did to the DOM.
export function CreateStoreForm() {
  const [state, formAction, isPending] = useActionState(createStore, initialState);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [locale, setLocale] = useState("bn");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  function errorBorder(field: CreateStoreField) {
    return state.field === field ? "border-red-500 focus:border-red-500" : "border-gray-300";
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <label className="flex flex-col gap-1">
        Store name
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`rounded border px-3 py-2 ${errorBorder("name")}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        Subdomain
        <div className="flex items-center gap-1">
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("slug")}`}
          />
          <span className="text-sm text-gray-500">.amarshop.com</span>
        </div>
      </label>
      <label className="flex flex-col gap-1">
        Language
        <select
          name="locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value="bn">বাংলা</option>
          <option value="en">English</option>
        </select>
      </label>
      <hr />
      <label className="flex flex-col gap-1">
        Your name
        <input
          name="ownerName"
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className={`rounded border px-3 py-2 ${errorBorder("ownerName")}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        Email
        <input
          name="ownerEmail"
          type="email"
          required
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          className={`rounded border px-3 py-2 ${errorBorder("ownerEmail")}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        Password
        <input
          name="ownerPassword"
          type="password"
          required
          minLength={8}
          value={ownerPassword}
          onChange={(e) => setOwnerPassword(e.target.value)}
          className={`rounded border px-3 py-2 ${errorBorder("ownerPassword")}`}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create store"}
      </button>
    </form>
  );
}
