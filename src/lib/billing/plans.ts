// The platform's subscription tiers — the single source of truth for every
// plan name, price and limit shown anywhere (CLAUDE.md rule #4). Pure data
// + pure functions, no DB import, so this module is safe to pull into a
// client component. Re-pricing or renaming a tier is an edit here and
// nowhere else.
//
// This is the merchant-pays-AmarShop side (rule #3) — unrelated to the
// customer-facing Order/Payment/Invoice code in src/lib/payments.

export type PlanId = "free" | "starter" | "business";
export type BillingCycle = "monthly" | "yearly";

export type PlanLimits = {
  // null = unlimited.
  // products/staff are total-count caps (checked on create).
  products: number | null;
  staff: number | null;
  // orders RECEIVED per calendar month (Asia/Dhaka). Over the cap, an
  // order is still recorded but locked from the merchant's admin view
  // until they upgrade — see src/lib/billing/order-quota.ts.
  orders: number | null;
};

export type Plan = {
  id: PlanId;
  // i18n key for the display name (rule #7 — never render the id).
  nameKey: string;
  // BDT per month.
  monthlyPrice: number;
  limits: PlanLimits;
  // Sort order, lowest = entry tier.
  order: number;
};

// PLACEHOLDER pricing — agreed with the user as a starting set, meant to be
// tuned later. Change freely; every screen reads from here.
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    nameKey: "billing.plan.free",
    monthlyPrice: 0,
    limits: { products: 30, staff: 1, orders: 50 },
    order: 0,
  },
  starter: {
    id: "starter",
    nameKey: "billing.plan.starter",
    monthlyPrice: 1000,
    limits: { products: 75, staff: 3, orders: 250 },
    order: 1,
  },
  business: {
    id: "business",
    nameKey: "billing.plan.business",
    monthlyPrice: 1500,
    limits: { products: null, staff: null, orders: null },
    order: 2,
  },
};

// Every tier, entry-first — for rendering the plan grid. Every tier is
// self-serve (pick + pay online); there is no "contact sales" tier.
export const PLAN_IDS = (Object.values(PLANS) as Plan[])
  .sort((a, b) => a.order - b.order)
  .map((p) => p.id);

// A yearly subscription is charged this many months of the monthly price
// (i.e. ~2 months free).
export const YEARLY_MONTHS_CHARGED = 10;

// Days of free trial a brand-new store gets (PROJECT_PLAN.md §8).
export const TRIAL_DAYS = 7;

// The tier whose limits a store enjoys *during* its trial. After the trial
// ends with no payment it falls back to "free".
export const TRIAL_PLAN: PlanId = "business";

export function isValidPlanId(value: string): value is PlanId {
  return value in PLANS;
}

export function isValidCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

// Price in BDT for a plan on a given cycle.
export function planPrice(planId: PlanId, cycle: BillingCycle): number {
  const plan = PLANS[planId];
  return cycle === "yearly" ? plan.monthlyPrice * YEARLY_MONTHS_CHARGED : plan.monthlyPrice;
}

export function planLimit(planId: PlanId, key: keyof PlanLimits): number | null {
  return PLANS[planId].limits[key];
}
