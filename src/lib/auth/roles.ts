import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "./config";
import { withStoreContext } from "@/db/context";
import { staffMembers, customRoles } from "@/db/schema";
import { parsePermissions, type Permission } from "./permissions";

export type StaffRole = "owner" | "admin" | "staff";

const ROLE_RANK: Record<StaffRole, number> = { staff: 0, admin: 1, owner: 2 };

// Who may add/edit/remove a given staff row. owner+admin both reach the
// staff-management screen (requireRole("admin")), but an admin must not be
// able to touch an owner — only another owner can. Also used by the page
// to hide the controls it wouldn't accept.
export function canManageStaffRow(actorRole: StaffRole, targetRole: StaffRole): boolean {
  return actorRole === "owner" || targetRole !== "owner";
}

// The admin dashboard's "current store" — the logged-in staff member's own
// store (session.user.storeId), NOT src/lib/tenant/current.ts's
// getCurrentStore(), which is proxy.ts's host-based resolution for the
// public storefront. Two different questions: "which store is this staff
// session for" vs. "which store does this Host header belong to."
export async function requireStaffSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session;
}

// Basic role gating — enforced server-side, at the call site of every
// admin action (Server Action / Route Handler), never in the UI alone
// (CLAUDE.md rule #8 on staff permissions). Just the owner > admin > staff
// rank check; still used directly by actions that stay owner/admin-only
// regardless of any custom role. For anything a "staff" role can be
// granted piecemeal, use requirePermission() below instead
// (SITE_STRUCTURE.md, Settings → Roles).
export async function requireRole(minimumRole: StaffRole) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (ROLE_RANK[session.user.role] < ROLE_RANK[minimumRole]) {
    throw new Error("Insufficient permissions");
  }
  return session;
}

// The "staff" rank's granted permissions, via their assigned custom role
// (Admin -> Roles). Empty when unassigned — matches the pre-/roles
// default of zero access to any of these actions. Not called for
// owner/admin (requirePermission() short-circuits them first), so this
// only ever runs for the rank that previously had no path to any of
// these actions at all. Exported so (admin)/layout.tsx can filter the
// nav to what a "staff" viewer can actually reach — a UI nicety, not the
// enforcement itself (that's still every call site's own
// requirePermission()).
export async function getStaffPermissions(storeId: string, email: string): Promise<Permission[]> {
  return withStoreContext(storeId, async (tx) => {
    const [me] = await tx
      .select({ customRoleId: staffMembers.customRoleId })
      .from(staffMembers)
      .where(and(eq(staffMembers.storeId, storeId), eq(staffMembers.email, email)))
      .limit(1);
    if (!me?.customRoleId) return [];

    const [role] = await tx
      .select({ permissions: customRoles.permissions })
      .from(customRoles)
      .where(and(eq(customRoles.id, me.customRoleId), eq(customRoles.storeId, storeId)))
      .limit(1);
    return role ? parsePermissions(role.permissions) : [];
  });
}

// Granular per-resource RBAC (SITE_STRUCTURE.md, Settings -> Roles) — the
// later phase requireRole()'s own comment referenced. owner and admin get
// the exact same unconditional access requireRole("admin") always gave
// them (zero behavior change); only "staff" now has a path to any of
// these actions, and only for whatever its assigned custom role grants.
export async function requirePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  if (ROLE_RANK[session.user.role] >= ROLE_RANK.admin) {
    return session;
  }
  const granted = await getStaffPermissions(
    session.user.storeId,
    (session.user.email ?? "").toLowerCase()
  );
  if (!granted.includes(permission)) {
    throw new Error("Insufficient permissions");
  }
  return session;
}

// Gates AmarShop's own internal tooling (not a merchant's store admin) —
// the real cross-tenant admin surface is Phase 5 (PROJECT_PLAN.md §8); this
// exists now only so that surface has a real, server-enforced check to
// build against instead of inventing one later.
export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user?.isPlatformAdmin) {
    throw new Error("Not authorized");
  }
  return session;
}

// Page/layout variant of requirePlatformAdmin: sends an unauthenticated or
// non-platform-admin visitor to /login instead of throwing a raw error
// page (mirrors how (admin)/layout.tsx redirects). Server Actions keep
// using requirePlatformAdmin() — a thrown error is the right outcome for a
// mutation, not a redirect.
export async function requirePlatformAdminPage() {
  const session = await auth();
  if (!session?.user?.isPlatformAdmin) {
    redirect("/login");
  }
  return session;
}
