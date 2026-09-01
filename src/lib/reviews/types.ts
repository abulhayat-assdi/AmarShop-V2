// Client-safe review helpers, shared by the storefront form, the
// storefront renderer and the admin moderation screen. No server imports.

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function isReviewStatus(v: string): v is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(v);
}

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export function isValidRating(n: number): boolean {
  return Number.isInteger(n) && n >= RATING_MIN && n <= RATING_MAX;
}

export const REVIEW_BODY_MAX = 2000;
export const REVIEW_AUTHOR_MAX = 80;

export type RatingSummary = { count: number; average: number };

// count -> "★★★★☆" style fill, rounded to the nearest whole star for the
// summary line. Returns [filled, empty] counts.
export function starCounts(average: number): { filled: number; empty: number } {
  const filled = Math.max(0, Math.min(RATING_MAX, Math.round(average)));
  return { filled, empty: RATING_MAX - filled };
}
