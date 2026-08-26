import { auth } from "./config";

type StaffRole = "owner" | "admin" | "staff";

const ROLE_RANK: Record<StaffRole, number> = { staff: 0, admin: 1, owner: 2 };

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
