// Single-source constants for the public marketing site (SITE_STRUCTURE.md
// Part A). CLAUDE.md rule #4: any figure the marketing pages repeat lives
// here (or in src/lib/billing/plans.ts for prices) and every page reads it
// from one place — never hand-written twice.

// The one "how fast can I launch" number. SITE_STRUCTURE.md Part A flags
// the audited competitor for contradicting itself across 6hr/1hr/6min/"a
// day" depending on the rotating headline — pick one, keep it everywhere.
export const LAUNCH_MINUTES = 10;

// The operating entity named in body copy on the About page (a trust
// signal SITE_STRUCTURE.md Part A says not to bury only in the footer).
// PLACEHOLDER until the real company/brand is registered — see CLAUDE.md
// "Do not copy" and the amarshop-overview memory.
export const COMPANY_LEGAL_NAME = "AmarShop";
export const BRAND_NAME = "AmarShop";

// Marketing top-nav — shared by the header on every marketing page. Built
// here so the header and the (marketing) route group can't drift. `key` is
// an i18n key under marketing.nav.*; `href` is an app route.
export const MARKETING_NAV = [
  { key: "features", href: "/features" },
  { key: "pricing", href: "/pricing" },
] as const;

// The plan the pricing grid highlights / pre-selects (SITE_STRUCTURE.md
// Part A: "Pre-select your recommended tier"). A presentation choice, so it
// lives here rather than in src/lib/billing/plans.ts — type-checked
// against that file's PlanId union.
import type { PlanId } from "@/lib/billing/plans";

export const RECOMMENDED_PLAN_ID: PlanId = "starter";

