import { sql } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import { invoices } from "@/db/schema";

// Per-store sequential invoice number. Allocated inside the caller's
// transaction as max(number)+1 scoped to the store; the (store_id, number)
// unique index (see src/db/schema/invoices.ts) is the backstop against the
// rare concurrent-allocation race — on a collision the surrounding action
// fails and is retried, acceptable at this volume.
//
// INTERNAL ONLY — deliberately never rendered. The invoice PDF shows the
// order code instead (src/lib/invoices/pdf.ts), because a sequential
// number on a customer-facing document leaks the merchant's order volume
// to anyone who compares two invoices. The sequence is still recorded per
// store so there's an unbroken accounting series to hand a tax authority
// if formal VAT/Mushak challan numbering is ever added.
export async function allocateInvoiceNumber(tx: TenantTx, storeId: string): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${invoices.number}), 0)` })
    .from(invoices)
    .where(sql`${invoices.storeId} = ${storeId}`);
  return (row?.max ?? 0) + 1;
}
