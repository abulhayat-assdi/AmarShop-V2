"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { STAFF_ROLE_KEYS } from "@/lib/enum-labels";
import type { StaffRole } from "@/lib/auth/roles";
import { addStaffAction, type StaffState } from "./actions";

const initialState: StaffState = {};

export function StaffForm({ actorIsOwner }: { actorIsOwner: boolean }) {
  const [state, formAction, isPending] = useActionState(addStaffAction, initialState);
  const t = useTranslator();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
    }
  }

  // An admin can't create an owner (the server enforces it too).
  const roleOptions: StaffRole[] = actorIsOwner ? ["owner", "admin", "staff"] : ["admin", "staff"];
  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">{t("admin.staff.addTitle")}</h2>
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.staff.name")}
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.staff.email")}
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.staff.initialPassword")}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.staff.role")}
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            className={field}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {t(STAFF_ROLE_KEYS[r])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.staff.addSubmit")}
      </button>
    </form>
  );
}
