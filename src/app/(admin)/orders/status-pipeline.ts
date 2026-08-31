// Kept as a thin re-export so existing importers (this folder's page.tsx
// and actions.ts) don't churn — the real definition now lives in
// src/lib/orders/status.ts, shared with the /api/v1 write routes.
export { nextOrderStatus as nextStatus } from "@/lib/orders/status";
