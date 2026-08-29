import { ORDER_STATUSES } from "@/lib/enum-labels";

// Plain helper, not a Server Action — kept out of actions.ts because a
// "use server" file may only export async functions. Client-safe (no
// server imports) so client components can import it too.
//
// The forward pipeline is every order status except "canceled", which is
// reached by cancelling rather than by advancing. Derived from
// ORDER_STATUSES so the value list lives in exactly one place.
const STATUS_PIPELINE = ORDER_STATUSES.filter((status) => status !== "canceled");

export function nextStatus(current: string): (typeof STATUS_PIPELINE)[number] | null {
  const index = STATUS_PIPELINE.indexOf(current as (typeof STATUS_PIPELINE)[number]);
  if (index === -1 || index === STATUS_PIPELINE.length - 1) return null;
  return STATUS_PIPELINE[index + 1];
}
