import { ORDER_STATUSES } from "@/lib/enum-labels";

// The forward order-status pipeline: every status except "canceled", which
// is reached by cancelling rather than by advancing. Derived from
// ORDER_STATUSES so the value list lives in exactly one place. Pure and
// server-import-free — safe for client components and lib code alike.
export const ORDER_STATUS_PIPELINE = ORDER_STATUSES.filter((s) => s !== "canceled");

export type PipelineStatus = (typeof ORDER_STATUS_PIPELINE)[number];

// The one status an order may advance to from `current`, or null when it's
// unknown or already at the end of the pipeline.
export function nextOrderStatus(current: string): PipelineStatus | null {
  const i = ORDER_STATUS_PIPELINE.indexOf(current as PipelineStatus);
  if (i === -1 || i === ORDER_STATUS_PIPELINE.length - 1) return null;
  return ORDER_STATUS_PIPELINE[i + 1];
}
