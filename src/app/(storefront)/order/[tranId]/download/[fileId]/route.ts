import { and, eq, ne, sql } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import {
  orders,
  orderItems,
  payments,
  productDigitalFiles,
  productVariants,
  products,
} from "@/db/schema";
import { getStorageAdapter } from "@/lib/storage";
import { canReleaseDownloads } from "@/lib/products/digital";

// Guest download for a digital product's PDF — keyed by the unguessable
// tranId (payments.transactionId), the same gate the order-confirmation
// page uses. The file must belong to a product in this order; released
// only once payment is confirmed (or the order has a physical line).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tranId: string; fileId: string }> }
) {
  const { tranId, fileId } = await params;
  const store = await getCurrentStore();
  if (!store) return new Response("Not found", { status: 404 });

  const data = await withStoreContext(store.id, async (tx) => {
    const [payment] = await tx
      .select({ orderId: payments.orderId, status: payments.status })
      .from(payments)
      .where(and(eq(payments.storeId, store.id), eq(payments.transactionId, tranId)))
      .limit(1);
    if (!payment) return null;

    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.storeId, store.id), eq(orders.id, payment.orderId)))
      .limit(1);
    if (!order) return null;

    // The file must be attached to a product that's a line on this order.
    const [file] = await tx
      .select({
        storageKey: productDigitalFiles.storageKey,
        fileName: productDigitalFiles.fileName,
      })
      .from(productDigitalFiles)
      .innerJoin(products, eq(products.id, productDigitalFiles.productId))
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .innerJoin(orderItems, eq(orderItems.productVariantId, productVariants.id))
      .where(
        and(
          eq(productDigitalFiles.storeId, store.id),
          eq(productDigitalFiles.id, fileId),
          eq(orderItems.orderId, order.id)
        )
      )
      .limit(1);
    if (!file) return null;

    const [{ physical }] = await tx
      .select({ physical: sql<number>`count(*)::int` })
      .from(orderItems)
      .innerJoin(productVariants, eq(productVariants.id, orderItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(orderItems.storeId, store.id),
          eq(orderItems.orderId, order.id),
          ne(products.isDigital, true)
        )
      );

    return {
      file,
      released: canReleaseDownloads({ id: order.id }, payment, physical > 0),
    };
  });

  if (!data) return new Response("Not found", { status: 404 });
  if (!data.released) {
    return new Response("This download will be available once payment is confirmed.", {
      status: 403,
    });
  }

  let bytes: Buffer;
  try {
    bytes = await getStorageAdapter().get(data.file.storageKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.file.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
