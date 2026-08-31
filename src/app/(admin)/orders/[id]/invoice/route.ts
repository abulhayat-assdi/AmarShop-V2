import { and, eq, isNotNull } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { orders } from "@/db/schema";
import { getInvoicePdf } from "@/lib/invoices/service";

// Admin download: the order must belong to the logged-in staff member's own
// store (session.user.storeId) — enforced by both the explicit store_id
// filter in getInvoicePdf and Postgres RLS. A mismatch returns 404, never a
// PDF from another tenant.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaffSession();
  const { id } = await params;

  // An over-quota (locked) order is redacted in the admin — no invoice
  // either, until the merchant upgrades. The customer's own tranId-keyed
  // invoice route is unaffected.
  const [locked] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, session.user.storeId),
          eq(orders.id, id),
          isNotNull(orders.quotaLockedAt)
        )
      )
      .limit(1)
  );
  if (locked) {
    return new Response("Not found", { status: 404 });
  }

  const result = await getInvoicePdf(session.user.storeId, id);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
