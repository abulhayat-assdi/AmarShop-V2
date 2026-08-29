import { sql } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import { orders } from "@/db/schema";

// Per-store sequential order number. Allocated inside the caller's
// transaction as max(order_number)+1 scoped to the store; the
// (store_id, order_number) unique index (see src/db/schema/orders.ts) is
// the backstop against the rare concurrent-allocation race — on a
// collision the surrounding action fails and is retried, acceptable at
// this volume. Same pattern as src/lib/invoices/number.ts.
export async function allocateOrderNumber(tx: TenantTx, storeId: string): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${orders.orderNumber}), 0)` })
    .from(orders)
    .where(sql`${orders.storeId} = ${storeId}`);
  return (row?.max ?? 0) + 1;
}

// Human-facing form: "#0042".
export function formatOrderNumber(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}
