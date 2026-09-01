"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { PERMISSIONS, PERMISSION_LABEL_KEYS, type Permission } from "@/lib/auth/permissions";
import { createRoleAction, updateRoleAction, type RoleState } from "./actions";

const initialState: RoleState = {};

export function RoleForm({
  role,
}: {
  role?: { id: string; name: string; permissions: Permission[] };
}) {
  const action = role ? updateRoleAction : createRoleAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const t = useTranslator();
  const [name, setName] = useState(role?.name ?? "");
  const [selected, setSelected] = useState<Set<Permission>>(new Set(role?.permissions ?? []));

  function toggle(p: Permission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
      {role && <input type="hidden" name="roleId" value={role.id} />}
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.roles.saved")}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.roles.name")}
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">{t("admin.roles.permissions")}</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {PERMISSIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="permissions"
                value={p}
                checked={selected.has(p)}
                onChange={() => toggle(p)}
              />
              {t(PERMISSION_LABEL_KEYS[p])}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending
          ? t("admin.common.saving")
          : role
            ? t("admin.common.save")
            : t("admin.roles.create")}
      </button>
    </form>
  );
}
