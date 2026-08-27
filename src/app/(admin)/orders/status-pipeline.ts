// Plain helper, not a Server Action — kept out of actions.ts because a
// "use server" file may only export async functions.
const STATUS_PIPELINE = [
  "placed",
  "confirmed",
  "ready",
  "shipped",
  "delivered",
  "completed",
] as const;

export function nextStatus(current: string): (typeof STATUS_PIPELINE)[number] | null {
  const index = STATUS_PIPELINE.indexOf(current as (typeof STATUS_PIPELINE)[number]);
  if (index === -1 || index === STATUS_PIPELINE.length - 1) return null;
  return STATUS_PIPELINE[index + 1];
}
