import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { payments } from "@/db/schema";
import { getInvoicePdf } from "@/lib/invoices/service";

// Storefront download for guest checkout — keyed by the unguessable tranId
// (a random UUID stored on payments.transactionId, generated before the
// order row existed), exactly how the order-confirmation page already gates
// access. No customer login exists by design (guest checkout only).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tranId: string }> }
) {
  const { tranId } = await params;
  const store = await getCurrentStore();
  if (!store) {
    return new Response("Not found", { status: 404 });
  }

  const [payment] = await withStoreContext(store.id, (tx) =>
    tx
      .select({ orderId: payments.orderId })
      .from(payments)
      .where(and(eq(payments.storeId, store.id), eq(payments.transactionId, tranId)))
      .limit(1)
  );
  if (!payment) {
    return new Response("Not found", { status: 404 });
  }

  const result = await getInvoicePdf(store.id, payment.orderId);
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
