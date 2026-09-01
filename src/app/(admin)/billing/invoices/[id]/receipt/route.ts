import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { platformInvoices, stores } from "@/db/schema";
import { renderPlatformReceiptPdf } from "@/lib/billing/receipt";

// Merchant download of a subscription-payment receipt. platform_invoices
// sits outside the RLS boundary (like stores), so it's scoped explicitly
// by the session's storeId. Only a `paid` invoice has a receipt.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("billing:manage");
  const { id } = await params;

  const [invoice] = await db
    .select()
    .from(platformInvoices)
    .where(and(eq(platformInvoices.id, id), eq(platformInvoices.storeId, session.user.storeId)))
    .limit(1);
  if (!invoice || invoice.status !== "paid") {
    return new Response("Not found", { status: 404 });
  }

  const [store] = await db
    .select({ name: stores.name, slug: stores.slug, locale: stores.locale })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  if (!store) return new Response("Not found", { status: 404 });

  const pdf = await renderPlatformReceiptPdf({ invoice, store });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="amarshop-receipt-${invoice.id.slice(0, 8)}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
