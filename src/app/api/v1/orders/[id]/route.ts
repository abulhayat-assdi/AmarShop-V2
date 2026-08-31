import { after } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders } from "@/db/schema";
import { authenticateApi, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { loadOrderDto } from "@/lib/api/records";
import { advanceOrderStatusTx, cancelOrderTx, markOrderPaidTx } from "@/lib/orders/mutate";
import { nextOrderStatus } from "@/lib/orders/status";
import { emitWebhook } from "@/lib/webhooks/dispatch";
import { sendOrderSms } from "@/lib/sms/notifications";
import { ORDER_STATUSES } from "@/lib/enum-labels";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(req, "read:orders");
  if (!("storeId" in ctx)) return ctx;
  const { id } = await params;

  const dto = await withStoreContext(ctx.storeId, (tx) => loadOrderDto(tx, ctx.storeId, id));
  if (!dto) return jsonError(404, "not_found", "No order with that id.");
  return jsonOk(dto);
}

// PATCH /api/v1/orders/{id} — body { "status"?: <order status>, "payment"?: "paid" }.
// `status` is admin-style: only nextStatus(current) or "canceled" (else
// 409 invalid_transition). `payment: "paid"` flips a non-gateway order's
// payment (else 409 payment_gateway_managed). All validation runs before
// any write, so a rejected field never leaves the other half applied.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(req, "write:orders");
  if (!("storeId" in ctx)) return ctx;
  const { id } = await params;

  const body = await readJson(req);
  if (!body) return jsonError(400, "bad_request", "Send a JSON object body.");

  const wantsStatus = "status" in body;
  const wantsPayment = "payment" in body;
  if (!wantsStatus && !wantsPayment) {
    return jsonError(400, "bad_request", "Provide `status` and/or `payment`.");
  }
  if (wantsStatus && !(ORDER_STATUSES as string[]).includes(String(body.status))) {
    return jsonError(400, "bad_request", "Unknown `status` value.");
  }
  if (wantsPayment && body.payment !== "paid") {
    return jsonError(400, "bad_request", '`payment` may only be set to "paid".');
  }
  const targetStatus = wantsStatus
    ? (String(body.status) as (typeof ORDER_STATUSES)[number])
    : null;

  const result = await withStoreContext(ctx.storeId, async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status, paymentMethod: orders.paymentMethod })
      .from(orders)
      .where(
        and(eq(orders.storeId, ctx.storeId), eq(orders.id, id), isNull(orders.quotaLockedAt))
      )
      .limit(1);
    if (!order) return { code: 404 as const };

    // ---- validate every requested change first — no partial writes ----
    if (wantsPayment && order.paymentMethod === "sslcommerz") {
      return {
        code: 409 as const,
        reason: "payment_gateway_managed",
        message: "This order pays through SSLCommerz — its payment status is set by the gateway.",
      };
    }
    if (targetStatus === "canceled") {
      if (order.status === "completed" || order.status === "canceled") {
        return {
          code: 409 as const,
          reason: "invalid_transition",
          message: `Order is ${order.status} and can't be canceled.`,
        };
      }
    } else if (targetStatus) {
      const allowed = nextOrderStatus(order.status);
      if (targetStatus !== allowed) {
        return {
          code: 409 as const,
          reason: "invalid_transition",
          message: allowed
            ? `Order is ${order.status}; the only allowed next status is "${allowed}" (or "canceled").`
            : `Order is ${order.status} and can't be advanced further.`,
        };
      }
    }

    // ---- apply ----
    let paid = false;
    let statusChanged = false;
    let advancedTo: string | null = null;

    if (wantsPayment) {
      paid = (await markOrderPaidTx(tx, ctx.storeId, id)) === "paid";
    }
    if (targetStatus === "canceled") {
      statusChanged = !!(await cancelOrderTx(tx, ctx.storeId, id));
    } else if (targetStatus) {
      const step = await advanceOrderStatusTx(tx, ctx.storeId, id);
      statusChanged = !!step;
      advancedTo = step?.to ?? null;
    }

    const dto = await loadOrderDto(tx, ctx.storeId, id);
    return { code: 200 as const, dto: dto!, paid, statusChanged, advancedTo };
  });

  if (result.code === 404) return jsonError(404, "not_found", "No order with that id.");
  if (result.code === 409) return jsonError(409, result.reason, result.message);

  if (result.statusChanged) {
    after(() => emitWebhook(ctx.storeId, "order.status_changed", { orderId: id }));
  }
  if (result.advancedTo === "shipped") {
    after(() => sendOrderSms(ctx.storeId, id, "order_shipped"));
  }
  if (result.paid) {
    after(() => emitWebhook(ctx.storeId, "order.paid", { orderId: id }));
  }
  return jsonOk(result.dto);
}
