"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { STAFF_ROLE_KEYS } from "@/lib/enum-labels";
import type { StaffRole } from "@/lib/auth/roles";
import { deleteStaffAction, setStaffRoleAction, type StaffState } from "./actions";

const initialState: StaffState = {};

// The editable controls for one staff row. The page only renders this when
// the actor may manage the row and it isn't their own — otherwise it shows
// plain text.
export function StaffRow({
  staffId,
  role,
  actorIsOwner,
}: {
  staffId: string;
  role: StaffRole;
  actorIsOwner: boolean;
}) {
  const t = useTranslator();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, roleAction] = useActionState(
    setStaffRoleAction.bind(null, staffId),
    initialState
  );
  const [confirming, setConfirming] = useState(false);

  const roleOptions: StaffRole[] = actorIsOwner ? ["owner", "admin", "staff"] : ["admin", "staff"];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <form ref={formRef} action={roleAction}>
          <select
            name="role"
            defaultValue={role}
            onChange={() => formRef.current?.requestSubmit()}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {t(STAFF_ROLE_KEYS[r])}
              </option>
            ))}
          </select>
        </form>

        {confirming ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">{t("admin.staff.deleteQ")}</span>
            <form action={deleteStaffAction.bind(null, staffId)}>
              <button type="submit" className="text-red-600 underline">
                {t("admin.staff.confirm")}
              </button>
            </form>
            <button type="button" onClick={() => setConfirming(false)} className="underline">
              {t("admin.staff.cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm text-red-600 underline"
          >
            {t("admin.staff.delete")}
          </button>
        )}
      </div>
      {state.error && <p className="text-xs text-red-700">{t(state.error)}</p>}
    </div>
  );
}
