"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { canManageStaffRow, requireRole, type StaffRole } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { staffMembers } from "@/db/schema";
import { checkPlanLimit } from "@/lib/billing/limits";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLES: StaffRole[] = ["owner", "admin", "staff"];

// error holds an i18n key the client resolves.
export type StaffState = { error?: string; ok?: boolean };

// Postgres unique_violation on the GLOBAL email index — an email already
// used by any store, not just this one. The message stays generic on
// purpose (see the plan): it must not confirm another store has it.
function isEmailTaken(err: unknown): boolean {
  const cause = (err as { cause?: unknown } | null)?.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "23505" &&
    (cause as { constraint_name?: string }).constraint_name === "staff_members_email_idx"
  );
}

async function ownerCount(tx: Parameters<Parameters<typeof withStoreContext>[1]>[0], storeId: string) {
  const [{ count }] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(staffMembers)
    .where(and(eq(staffMembers.storeId, storeId), eq(staffMembers.role, "owner")));
  return count;
}

export async function addStaffAction(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const session = await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawRole = String(formData.get("role") ?? "staff");
  const role: StaffRole = (ROLES as string[]).includes(rawRole) ? (rawRole as StaffRole) : "staff";

  if (!name) return { error: "admin.staff.errName" };
  if (!EMAIL_RE.test(email)) return { error: "admin.staff.errEmail" };
  if (password.length < 8) return { error: "admin.staff.errPassword" };
  if (role === "owner" && session.user.role !== "owner") return { error: "admin.staff.errForbidden" };

  const planCheck = await checkPlanLimit(session.user.storeId, "staff", 1);
  if (!planCheck.ok) return { error: "admin.staff.errPlanLimit" };

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await withStoreContext(session.user.storeId, (tx) =>
      tx.insert(staffMembers).values({ storeId: session.user.storeId, name, email, passwordHash, role })
    );
  } catch (err) {
    if (isEmailTaken(err)) return { error: "admin.staff.errEmailTaken" };
    throw err;
  }

  revalidatePath("/staff");
  return { ok: true };
}

export async function setStaffRoleAction(
  staffId: string,
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const session = await requireRole("admin");

  const rawRole = String(formData.get("role") ?? "");
  if (!(ROLES as string[]).includes(rawRole)) return { error: "admin.staff.errForbidden" };
  const newRole = rawRole as StaffRole;
  const myEmail = (session.user.email ?? "").toLowerCase();

  const result = await withStoreContext(session.user.storeId, async (tx) => {
    const [target] = await tx
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, staffId)))
      .limit(1);

    if (!target) return { error: "admin.staff.errForbidden" } as StaffState;
    if (target.email.toLowerCase() === myEmail) return { error: "admin.staff.errSelf" } as StaffState;
    if (!canManageStaffRow(session.user.role, target.role)) {
      return { error: "admin.staff.errForbidden" } as StaffState;
    }
    if (newRole === "owner" && session.user.role !== "owner") {
      return { error: "admin.staff.errForbidden" } as StaffState;
    }
    if (target.role === "owner" && newRole !== "owner" && (await ownerCount(tx, session.user.storeId)) <= 1) {
      return { error: "admin.staff.errLastOwner" } as StaffState;
    }

    await tx
      .update(staffMembers)
      .set({ role: newRole, updatedAt: new Date() })
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, staffId)));
    return { ok: true } as StaffState;
  });

  revalidatePath("/staff");
  return result;
}

// Plain action (bound + <form>), silently no-ops on a guard miss — the
// button is already hidden when the actor can't act, so this only guards
// a race.
export async function deleteStaffAction(staffId: string) {
  const session = await requireRole("admin");
  const myEmail = (session.user.email ?? "").toLowerCase();

  await withStoreContext(session.user.storeId, async (tx) => {
    const [target] = await tx
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, staffId)))
      .limit(1);

    if (!target) return;
    if (target.email.toLowerCase() === myEmail) return;
    if (!canManageStaffRow(session.user.role, target.role)) return;
    if (target.role === "owner" && (await ownerCount(tx, session.user.storeId)) <= 1) return;

    await tx
      .delete(staffMembers)
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.id, staffId)));
  });

  revalidatePath("/staff");
}
