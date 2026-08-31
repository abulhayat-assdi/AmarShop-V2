// The platform's subscription tiers — the single source of truth for every
// plan name, price and limit shown anywhere (CLAUDE.md rule #4). Pure data
// + pure functions, no DB import, so this module is safe to pull into a
// client component. Re-pricing or renaming a tier is an edit here and
// nowhere else.
//
// This is the merchant-pays-AmarShop side (rule #3) — unrelated to the
// customer-facing Order/Payment/Invoice code in src/lib/payments.

export type PlanId = "free" | "starter" | "business" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export type PlanLimits = {
  // null = unlimited.
  products: number | null;
  staff: number | null;
};

export type Plan = {
  id: PlanId;
  // i18n key for the display name (rule #7 — never render the id).
  nameKey: string;
  // BDT per month. Ignored when `custom` is true.
  monthlyPrice: number;
  // true = "contact sales", no self-serve price or checkout (enterprise).
  custom: boolean;
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
    custom: false,
    limits: { products: 50, staff: 1 },
    order: 0,
  },
  starter: {
    id: "starter",
    nameKey: "billing.plan.starter",
    monthlyPrice: 500,
    custom: false,
    limits: { products: 500, staff: 3 },
    order: 1,
  },
  business: {
    id: "business",
    nameKey: "billing.plan.business",
    monthlyPrice: 1500,
    custom: false,
    limits: { products: null, staff: null },
    order: 2,
  },
  enterprise: {
    id: "enterprise",
    nameKey: "billing.plan.enterprise",
    monthlyPrice: 0,
    custom: true,
    limits: { products: null, staff: null },
    order: 3,
  },
};

// Every tier, entry-first — for rendering the plan grid.
export const PLAN_IDS = (Object.values(PLANS) as Plan[])
  .sort((a, b) => a.order - b.order)
  .map((p) => p.id);

// Tiers a merchant can pick and pay for without talking to sales.
export const SELF_SERVE_PLAN_IDS = PLAN_IDS.filter((id) => !PLANS[id].custom);

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

// Price in BDT for a plan on a given cycle. Custom (enterprise) → 0, since
// it has no self-serve price.
export function planPrice(planId: PlanId, cycle: BillingCycle): number {
  const plan = PLANS[planId];
  if (plan.custom) return 0;
  return cycle === "yearly" ? plan.monthlyPrice * YEARLY_MONTHS_CHARGED : plan.monthlyPrice;
}

export function planLimit(planId: PlanId, key: keyof PlanLimits): number | null {
  return PLANS[planId].limits[key];
}
