"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { products, productVariants, deliveryZones } from "@/db/schema";
import { BD_PHONE_PATTERN, createOrderRecords, type OrderLine } from "@/lib/orders/create";
import { advanceOrderStatusTx, cancelOrderTx, markOrderPaidTx } from "@/lib/orders/mutate";
import {
  bookShipment,
  cancelShipment,
  refreshShipmentStatus,
} from "@/lib/courier/shipments";
import { COURIER_PROVIDERS } from "@/lib/courier/providers";
import type { CourierProvider } from "@/lib/courier/types";
import { sendOrderSms } from "@/lib/sms/notifications";
import { emitWebhook } from "@/lib/webhooks/dispatch";
import { runFraudCheck } from "@/lib/fraud/check";

// Bound with (orderId) from the detail page's buttons — see
// src/app/(admin)/orders/[id]/page.tsx. Guided one-step-at-a-time advance,
// not a free-form status dropdown (see the plan's design note). Shares
// advanceOrderStatusTx with the /api/v1 PATCH /orders route.
export async function advanceOrderStatus(orderId: string) {
  const session = await requireStaffSession();
  const { storeId } = session.user;

  const step = await withStoreContext(storeId, (tx) => advanceOrderStatusTx(tx, storeId, orderId));

  if (step?.to === "shipped") {
    after(() => sendOrderSms(storeId, orderId, "order_shipped"));
  }
  if (step) {
    after(() => emitWebhook(storeId, "order.status_changed", { orderId }));
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

export async function cancelOrder(orderId: string) {
  const session = await requireStaffSession();
  const { storeId } = session.user;

  const canceled = await withStoreContext(storeId, (tx) => cancelOrderTx(tx, storeId, orderId));

  if (canceled) {
    after(() => emitWebhook(storeId, "order.status_changed", { orderId }));
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

// A COD order's payment being collected doesn't always line up with any
// one status transition, so this is deliberately its own action — see the
// plan's design note. Shares markOrderPaidTx with PATCH /orders.
export async function markPaymentReceived(orderId: string) {
  const session = await requireStaffSession();
  const { storeId } = session.user;

  const result = await withStoreContext(storeId, (tx) => markOrderPaidTx(tx, storeId, orderId));

  if (result === "paid") {
    after(() => emitWebhook(storeId, "order.paid", { orderId }));
  }

  revalidatePath(`/orders/${orderId}`);
}

// Re-run the BDCourier fraud check for an order on demand (the "Re-check"
// button on the order detail). runFraudCheck never throws.
export async function recheckFraud(orderId: string) {
  const session = await requireStaffSession();
  await runFraudCheck(session.user.storeId, orderId);
  revalidatePath(`/orders/${orderId}`);
}

// ---- manual (phone / walk-in) order entry — src/app/(admin)/orders/create ----

export type ManualOrderField = "name" | "phone" | "address" | "deliveryZoneId" | "lines";
export type ManualOrderState = { error?: string; field?: ManualOrderField };

type RequestedLine = { variantId: string; quantity: number };

function parseLines(raw: string): RequestedLine[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const lines: RequestedLine[] = [];
  for (const entry of parsed) {
    const variantId = (entry as { variantId?: unknown })?.variantId;
    const quantity = (entry as { quantity?: unknown })?.quantity;
    if (typeof variantId !== "string" || !variantId) return null;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) return null;
    lines.push({ variantId, quantity });
  }
  return lines;
}

export async function createManualOrder(
  _prevState: ManualOrderState,
  formData: FormData
): Promise<ManualOrderState> {
  const session = await requireStaffSession();
  const { storeId } = session.user;

  const customerName = String(formData.get("name") ?? "").trim();
  const customerPhone = String(formData.get("phone") ?? "").trim();
  const customerAddress = String(formData.get("address") ?? "").trim();
  const customerEmail = String(formData.get("email") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const deliveryZoneId = String(formData.get("deliveryZoneId") ?? "").trim();
  const alreadyPaid = formData.get("alreadyPaid") === "on";

  if (!customerName) return { error: "Customer name is required.", field: "name" };
  if (!BD_PHONE_PATTERN.test(customerPhone)) {
    return { error: "Enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX).", field: "phone" };
  }
  if (!customerAddress) return { error: "Delivery address is required.", field: "address" };
  if (!deliveryZoneId) return { error: "Select a delivery zone.", field: "deliveryZoneId" };

  const requested = parseLines(String(formData.get("lines") ?? ""));
  if (!requested) return { error: "Add at least one product to the order.", field: "lines" };

  let orderId: string;
  try {
    orderId = await withStoreContext(storeId, async (tx) => {
      const variantRows = await tx
        .select({
          id: productVariants.id,
          sku: productVariants.sku,
          price: productVariants.price,
          discountedPrice: productVariants.discountedPrice,
          productName: products.name,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(
          and(
            eq(productVariants.storeId, storeId),
            eq(products.status, "active"),
            inArray(
              productVariants.id,
              requested.map((line) => line.variantId)
            )
          )
        );
      const byId = new Map(variantRows.map((row) => [row.id, row]));

      const lines: OrderLine[] = [];
      for (const line of requested) {
        const variant = byId.get(line.variantId);
        if (!variant) {
          throw Object.assign(new Error("One of the selected products is no longer available."), {
            isBadLine: true,
          });
        }
        lines.push({
          variantId: variant.id,
          productName: variant.productName,
          sku: variant.sku,
          unitPrice: String(variant.discountedPrice ?? variant.price),
          quantity: line.quantity,
          isDigital: false,
        });
      }

      const [zone] = await tx
        .select()
        .from(deliveryZones)
        .where(and(eq(deliveryZones.storeId, storeId), eq(deliveryZones.id, deliveryZoneId)))
        .limit(1);
      if (!zone) {
        throw Object.assign(new Error("That delivery zone no longer exists."), {
          isInvalidZone: true,
        });
      }

      const subtotal = lines.reduce(
        (sum, line) => sum + Number(line.unitPrice) * line.quantity,
        0
      );
      const deliveryCharge = Number(zone.charge);

      const order = await createOrderRecords(tx, {
        storeId,
        cartId: null,
        lines,
        deliveryZoneId: zone.id,
        deliveryCharge,
        subtotal,
        total: subtotal + deliveryCharge,
        customerName,
        customerPhone,
        customerAddress,
        customerEmail,
        notes,
        paymentMethod: "cod",
        paymentStatus: alreadyPaid ? "paid" : "pending",
        tranId: randomUUID(),
      });
      return order.id;
    });
    after(() => sendOrderSms(storeId, orderId, "order_placed"));
    after(() => emitWebhook(storeId, "order.created", { orderId }));
    if (alreadyPaid) {
      after(() => emitWebhook(storeId, "order.paid", { orderId }));
    }
    // Manual orders are always COD — run a BDCourier fraud check.
    after(() => runFraudCheck(storeId, orderId));
  } catch (err) {
    if ((err as { isBadLine?: boolean } | null)?.isBadLine) {
      return { error: (err as Error).message, field: "lines" };
    }
    if ((err as { isInvalidZone?: boolean } | null)?.isInvalidZone) {
      return { error: (err as Error).message, field: "deliveryZoneId" };
    }
    if ((err as { isOutOfStock?: boolean } | null)?.isOutOfStock) {
      return { error: (err as Error).message, field: "lines" };
    }
    throw err;
  }

  revalidatePath("/orders");
  redirect(`/orders/${orderId}`);
}

// ---- courier / shipment (src/lib/courier) — bound with an id from the
// order detail page's buttons ----

export type ShipmentActionState = { error?: string };

// Book the order with a courier. `provider` comes from the form (a hidden
// input for the single-courier button, a <select> when several are set up);
// omitted → the store's default courier. Used by the orders-list Courier
// column and the order-detail Shipment panel.
export async function sendToCourierAction(
  orderId: string,
  _prev: ShipmentActionState,
  formData: FormData
): Promise<ShipmentActionState> {
  const session = await requireStaffSession();
  const raw = String(formData.get("provider") ?? "").trim();
  const provider =
    raw && (COURIER_PROVIDERS as string[]).includes(raw) ? (raw as CourierProvider) : undefined;

  try {
    await bookShipment(session.user.storeId, orderId, provider);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not book the courier." };
  }
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  return {};
}

export async function refreshShipmentAction(
  orderId: string,
  shipmentId: string
): Promise<ShipmentActionState> {
  const session = await requireStaffSession();
  try {
    await refreshShipmentStatus(session.user.storeId, shipmentId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not refresh status." };
  }
  revalidatePath(`/orders/${orderId}`);
  return {};
}

export async function cancelShipmentAction(
  orderId: string,
  shipmentId: string
): Promise<ShipmentActionState> {
  const session = await requireStaffSession();
  try {
    await cancelShipment(session.user.storeId, shipmentId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not cancel the shipment." };
  }
  revalidatePath(`/orders/${orderId}`);
  return {};
}
