"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { customRoles } from "@/db/schema";
import { parsePermissions, serializePermissions } from "@/lib/auth/permissions";

export type RoleState = { error?: string; ok?: boolean };

function readPermissions(formData: FormData): string {
  return serializePermissions(parsePermissions(formData.getAll("permissions").map(String)));
}

export async function createRoleAction(_prev: RoleState, formData: FormData): Promise<RoleState> {
  const session = await requirePermission("staff:manage");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "admin.roles.errName" };

  try {
    await withStoreContext(session.user.storeId, (tx) =>
      tx.insert(customRoles).values({
        storeId: session.user.storeId,
        name,
        permissions: readPermissions(formData),
      })
    );
  } catch {
    return { error: "admin.roles.errNameTaken" };
  }

  revalidatePath("/roles");
  return { ok: true };
}

export async function updateRoleAction(_prev: RoleState, formData: FormData): Promise<RoleState> {
  const session = await requirePermission("staff:manage");
  const roleId = String(formData.get("roleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!roleId) return { error: "admin.roles.errName" };
  if (!name) return { error: "admin.roles.errName" };

  try {
    await withStoreContext(session.user.storeId, (tx) =>
      tx
        .update(customRoles)
        .set({ name, permissions: readPermissions(formData), updatedAt: new Date() })
        .where(and(eq(customRoles.id, roleId), eq(customRoles.storeId, session.user.storeId)))
    );
  } catch {
    return { error: "admin.roles.errNameTaken" };
  }

  revalidatePath("/roles");
  return { ok: true };
}

// staff_members.custom_role_id references this with ON DELETE SET NULL —
// deleting a role in use just un-assigns it from everyone, it never fails
// or silently leaves a dangling reference.
export async function deleteRoleAction(formData: FormData): Promise<void> {
  const session = await requirePermission("staff:manage");
  const roleId = String(formData.get("roleId") ?? "");
  if (!roleId) return;

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .delete(customRoles)
      .where(and(eq(customRoles.id, roleId), eq(customRoles.storeId, session.user.storeId)))
  );

  revalidatePath("/roles");
}
