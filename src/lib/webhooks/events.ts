// The webhook event catalogue — the single source of truth for what a
// merchant endpoint may subscribe to (referenced by the create form, the
// DB write validation, and every emitWebhook() call site). Slice 1 is
// order lifecycle only; `order.paid` and the write-side events land with
// later Phase 6 slices.

export const WEBHOOK_EVENTS = ["order.created", "order.status_changed"] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// i18n keys for each event's human label — shared by the webhooks admin
// screen. Client-safe (keys, not English), same convention as
// src/lib/enum-labels.ts and src/lib/api/scopes.ts.
export const WEBHOOK_EVENT_LABEL_KEYS: Record<WebhookEvent, string> = {
  "order.created": "admin.webhooks.eventOrderCreated",
  "order.status_changed": "admin.webhooks.eventOrderStatusChanged",
};

export function isValidEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

// Parse the stored comma-joined `webhook_endpoints.events` (or a form
// submission) into a clean, de-duplicated list of known events.
export function parseEvents(input: string | string[]): WebhookEvent[] {
  const raw = Array.isArray(input) ? input : input.split(",");
  const out = new Set<WebhookEvent>();
  for (const e of raw) {
    const t = e.trim();
    if (isValidEvent(t)) out.add(t);
  }
  return [...out];
}

export function serializeEvents(events: WebhookEvent[]): string {
  return [...new Set(events)].join(",");
}
