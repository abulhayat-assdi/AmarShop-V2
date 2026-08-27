import { requireStaffSession } from "@/lib/auth/roles";
import { getInvoicePdf } from "@/lib/invoices/service";

// Admin download: the order must belong to the logged-in staff member's own
// store (session.user.storeId) — enforced by both the explicit store_id
// filter in getInvoicePdf and Postgres RLS. A mismatch returns 404, never a
// PDF from another tenant.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaffSession();
  const { id } = await params;

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
