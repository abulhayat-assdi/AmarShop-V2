"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { staffMembers } from "@/db/schema";

export type AccountState = { error?: string; ok?: boolean };

export async function updateAccountAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await requireStaffSession();
  const email = (session.user.email ?? "").toLowerCase();
  if (!email) return { error: "admin.account.errName" };

  const name = String(formData.get("name") ?? "").trim();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name) return { error: "admin.account.errName" };

  const [me] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.email, email)))
      .limit(1)
  );
  if (!me) return { error: "admin.account.errName" };

  const patch: { name: string; passwordHash?: string; updatedAt: Date } = {
    name,
    updatedAt: new Date(),
  };

  if (newPassword || confirmPassword) {
    if (!(await bcrypt.compare(currentPassword, me.passwordHash))) {
      return { error: "admin.account.errCurrentPassword" };
    }
    if (newPassword.length < 8) return { error: "admin.account.errPassword" };
    if (newPassword !== confirmPassword) return { error: "admin.account.errPasswordMatch" };
    patch.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(staffMembers)
      .set(patch)
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, me.id)))
  );

  revalidatePath("/account");
  return { ok: true };
}
