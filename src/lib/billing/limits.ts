import { getSubscription, getUsage } from "./subscription";
import { planLimit } from "./plans";

// Hard limits on catalog size and staff seats, enforced on the create
// path (CLAUDE.md rule #3 — merchant-pays-AmarShop side). Checked against
// the store's EFFECTIVE plan (a trialing store gets business → unlimited).
// The monthly ORDER quota is a different mechanic — see ./order-quota.

export type LimitResource = "products" | "staff";

export type LimitCheck =
  | { ok: true; limit: number | null; used: number }
  | { ok: false; resource: LimitResource; limit: number; used: number; remaining: number };

// Would adding `adding` more of `resource` push the store past its
// effective plan limit? A null limit (unlimited / trial) is always ok.
// Pass adding=0 to just read { used, limit } for a page notice.
export async function checkPlanLimit(
  storeId: string,
  resource: LimitResource,
  adding = 1
): Promise<LimitCheck> {
  const sub = await getSubscription(storeId);
  const usage = await getUsage(storeId);
  const limit = planLimit(sub.effectivePlanId, resource);
  const used = usage[resource];
  if (limit === null) return { ok: true, limit: null, used };
  if (used + adding <= limit) return { ok: true, limit, used };
  return { ok: false, resource, limit, used, remaining: Math.max(0, limit - used) };
}
