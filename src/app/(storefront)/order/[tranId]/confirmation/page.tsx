import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { orders, orderItems, payments } from "@/db/schema";

// Reached from both COD's immediate redirect and SSLCommerz's success_url.
// Looked up by tranId (payments.transactionId), generated before the order
// existed — see src/app/(storefront)/checkout/actions.ts. Payment status
// shown here reflects whatever's on the payments row right now; for
// SSLCommerz that's still "pending" until its IPN listener (a later slice)
// confirms it — this page never claims a payment succeeded on the strength
// of the customer's browser landing here.
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ tranId: string }>;
}) {
  const { tranId } = await params;
  const store = await getCurrentStore();
  if (!store) notFound();

  const result = await withStoreContext(store.id, async (tx) => {
    const [payment] = await tx
      .select({ orderId: payments.orderId, status: payments.status, method: payments.method })
      .from(payments)
      .where(and(eq(payments.storeId, store.id), eq(payments.transactionId, tranId)))
      .limit(1);
    if (!payment) return null;

    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, store.id), eq(orders.id, payment.orderId)))
      .limit(1);
    if (!order) return null;

    const items = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.storeId, store.id), eq(orderItems.orderId, order.id)));

    return { order, items, payment };
  });

  if (!result) notFound();
  const { order, items, payment } = result;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Thank you, {order.customerName}!</h1>
      <p className="text-gray-600">
        Your order has been placed.{" "}
        {payment.method === "cod"
          ? "Pay on delivery."
          : payment.status === "paid"
            ? "Payment confirmed."
            : "Payment is being confirmed."}
      </p>

      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">Order Summary</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>৳{item.lineTotal}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>৳{order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>৳{order.deliveryCharge}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>৳{order.total}</span>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>Delivering to: {order.customerAddress}</p>
        <p>Phone: {order.customerPhone}</p>
      </div>

      <a
        href={`/order/${tranId}/invoice`}
        target="_blank"
        rel="noopener"
        className="text-sm underline"
      >
        Download invoice (PDF)
      </a>
    </div>
  );
}
