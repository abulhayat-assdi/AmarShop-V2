// Plain helper, not a Server Action — kept out of actions.ts because a
// "use server" file may only export async functions. Client-safe (no
// server imports) so client components can import the label map too.
const STATUS_PIPELINE = [
  "placed",
  "confirmed",
  "ready",
  "shipped",
  "delivered",
  "completed",
] as const;

// order_status value -> i18n key (see admin.orders.status* in the message
// files). Includes "canceled", which isn't part of the forward pipeline.
export const ORDER_STATUS_KEYS: Record<string, string> = {
  placed: "admin.orders.statusPlaced",
  confirmed: "admin.orders.statusConfirmed",
  ready: "admin.orders.statusReady",
  shipped: "admin.orders.statusShipped",
  delivered: "admin.orders.statusDelivered",
  completed: "admin.orders.statusCompleted",
  canceled: "admin.orders.statusCanceled",
};

export function nextStatus(current: string): (typeof STATUS_PIPELINE)[number] | null {
  const index = STATUS_PIPELINE.indexOf(current as (typeof STATUS_PIPELINE)[number]);
  if (index === -1 || index === STATUS_PIPELINE.length - 1) return null;
  return STATUS_PIPELINE[index + 1];
}
