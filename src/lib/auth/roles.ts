import { auth } from "./config";

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

// Basic role gating for Phase 0 — enforced server-side, at the call site of
// every admin action (Server Action / Route Handler), never in the UI alone
// (CLAUDE.md rule #8 on staff permissions). Granular per-resource RBAC is a
// later phase (SITE_STRUCTURE.md, Settings → Roles) — this is deliberately
// just an owner > admin > staff rank check until that lands.
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
