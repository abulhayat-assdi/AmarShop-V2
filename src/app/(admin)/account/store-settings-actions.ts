"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { stores, auditLogs, staffMembers } from "@/db/schema";
import { createNotice } from "@/lib/notices/create";

export type AccountState = { error?: string; ok?: boolean };

// Company tab: business profile on `stores`. Outside the RLS boundary —
// write via `db` directly, same as every other stores.* settings action.
export async function updateCompanyAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await requirePermission("settings:manage");

  const name = String(formData.get("name") ?? "").trim();
  const businessAddress = String(formData.get("businessAddress") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "Asia/Dhaka";
  const currency = String(formData.get("currency") ?? "").trim() || "BDT";

  if (!name) return { error: "admin.account.company.errName" };

  await db
    .update(stores)
    .set({
      name,
      businessAddress: businessAddress || null,
      timezone,
      currency,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/account");
  return { ok: true };
}

// System tab: maintenance mode — a plain on/off toggle, safe to flip
// either direction any time. (storefront)/layout.tsx reads it directly.
export async function toggleMaintenanceModeAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await requirePermission("settings:manage");
  const maintenanceMode = formData.get("maintenanceMode") != null;

  await db
    .update(stores)
    .set({ maintenanceMode, updatedAt: new Date() })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/account");
  return { ok: true };
}

// System tab: "Request store deletion." Deliberately NOT a self-service
// hard delete (see the schema comment on stores.deletionRequestedAt) —
// owner-only, requires typing the exact store name, and only records the
// request: sets the timestamp, writes an audit_logs row (the first real
// use of that table — it's existed unused since Phase 0), and raises a
// critical notice. A platform admin completes the actual deletion via the
// existing slug-confirmed hard delete at /platform/stores/[id].
export async function requestStoreDeletionAction(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const session = await requirePermission("settings:manage");
  if (session.user.role !== "owner") {
    return { error: "admin.account.system.errOwnerOnly" };
  }

  const [store] = await db
    .select({ name: stores.name, deletionRequestedAt: stores.deletionRequestedAt })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  if (!store) return { error: "admin.account.system.errConfirmName" };
  if (store.deletionRequestedAt) return { ok: true };

  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (confirmName !== store.name) {
    return { error: "admin.account.system.errConfirmName" };
  }

  const now = new Date();
  await db
    .update(stores)
    .set({ deletionRequestedAt: now, updatedAt: now })
    .where(eq(stores.id, session.user.storeId));

  await withStoreContext(session.user.storeId, async (tx) => {
    const [me] = await tx
      .select({ id: staffMembers.id })
      .from(staffMembers)
      .where(
        and(
          eq(staffMembers.storeId, session.user.storeId),
          eq(staffMembers.email, (session.user.email ?? "").toLowerCase())
        )
      )
      .limit(1);
    await tx.insert(auditLogs).values({
      storeId: session.user.storeId,
      staffMemberId: me?.id ?? null,
      action: "store.deletion_requested",
      metadata: { requestedByEmail: session.user.email ?? null },
    });
    await createNotice(tx, session.user.storeId, "store_deletion_requested");
  });

  revalidatePath("/account");
  return { ok: true };
}
