// The single source of truth for what a notice's `category` column may be
// — referenced by createNotice()'s validation and by the i18n lookup that
// renders each notice's message (admin.notices.<category> in
// src/lib/i18n/messages). Mirrors the shape of WEBHOOK_EVENTS
// (src/lib/webhooks/events.ts) / API_SCOPES (src/lib/api/scopes.ts).
//
// Only billing-lifecycle categories exist so far (src/lib/billing/
// lifecycle.ts is the only emitter today) — add a category here, its
// severity below, and its admin.notices.<category> i18n string whenever a
// new real emission point is wired up. Never invent a category that
// nothing actually creates.
export const NOTICE_CATEGORIES = [
  "billing_trial_ended",
  "billing_past_due",
  "billing_suspended",
  "store_deletion_requested",
] as const;

export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export type NoticeSeverity = "info" | "warning" | "critical";

export const NOTICE_SEVERITY_BY_CATEGORY: Record<NoticeCategory, NoticeSeverity> = {
  billing_trial_ended: "info",
  billing_past_due: "warning",
  billing_suspended: "critical",
  store_deletion_requested: "critical",
};

export function isValidNoticeCategory(value: string): value is NoticeCategory {
  return (NOTICE_CATEGORIES as readonly string[]).includes(value);
}
