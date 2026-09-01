"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { staffMembers } from "@/db/schema";

export type AccountState = { error?: string; ok?: boolean };

async function findMe(storeId: string, email: string) {
  const [me] = await withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.storeId, storeId), eq(staffMembers.email, email)))
      .limit(1)
  );
  return me;
}

// Profile tab: name, phone, bio. Split out of the old combined
// updateAccountAction now that General Settings has separate tabs
// (SITE_STRUCTURE.md's Profile vs. Security split).
export async function updateProfileAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await requireStaffSession();
  const email = (session.user.email ?? "").toLowerCase();
  if (!email) return { error: "admin.account.errName" };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  if (!name) return { error: "admin.account.errName" };

  const me = await findMe(session.user.storeId, email);
  if (!me) return { error: "admin.account.errName" };

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(staffMembers)
      .set({ name, phone: phone || null, bio: bio || null, updatedAt: new Date() })
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, me.id)))
  );

  revalidatePath("/account");
  return { ok: true };
}

// Security tab: password only.
export async function updatePasswordAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await requireStaffSession();
  const email = (session.user.email ?? "").toLowerCase();
  if (!email) return { error: "admin.account.errCurrentPassword" };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const me = await findMe(session.user.storeId, email);
  if (!me) return { error: "admin.account.errCurrentPassword" };

  if (!(await bcrypt.compare(currentPassword, me.passwordHash))) {
    return { error: "admin.account.errCurrentPassword" };
  }
  if (newPassword.length < 8) return { error: "admin.account.errPassword" };
  if (newPassword !== confirmPassword) return { error: "admin.account.errPasswordMatch" };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(staffMembers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, me.id)))
  );

  revalidatePath("/account");
  return { ok: true };
}

// Notifications tab: which notice categories this staff member's own bell
// shows. Store-wide notices are unaffected — see src/lib/notices/query.ts.
export async function updateNotificationsAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await requireStaffSession();
  const email = (session.user.email ?? "").toLowerCase();
  const me = await findMe(session.user.storeId, email);
  if (!me) return { error: "admin.account.errName" };

  const notifyBillingNotices = formData.get("notifyBillingNotices") != null;

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(staffMembers)
      .set({ notifyBillingNotices, updatedAt: new Date() })
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, me.id)))
  );

  revalidatePath("/account");
  return { ok: true };
}
