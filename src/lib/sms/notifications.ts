import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { orders, smsMessages, stores } from "@/db/schema";
import { formatOrderCode } from "@/lib/orders/number";
import { createSmsAdapter } from "./index";
import { getActiveSmsConfig } from "./settings";
import { toBdMsisdn } from "./phone";
import { renderSmsTemplate } from "./templates";

type OrderSmsEvent = "order_placed" | "order_shipped";
const MAX_BODY = 300;

// Fire-and-forget from a Server Action via `after()` — NEVER throws. A no-op
// when SMS isn't configured or the event's notify flag is off. Records
// every attempt in the sms_messages outbox (pending -> sent/failed).
export async function sendOrderSms(
  storeId: string,
  orderId: string,
  event: OrderSmsEvent
): Promise<void> {
  try {
    const active = await getActiveSmsConfig(storeId);
    if (!active) return;
    if (event === "order_placed" && !active.notifyOrderPlaced) return;
    if (event === "order_shipped" && !active.notifyOrderShipped) return;

    const [order] = await withStoreContext(storeId, (tx) =>
      tx
        .select({
          orderCode: orders.orderCode,
          customerPhone: orders.customerPhone,
          total: orders.total,
        })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)))
        .limit(1)
    );
    if (!order) return;

    // stores is outside the RLS boundary.
    const [store] = await db
      .select({ name: stores.name, locale: stores.locale })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    let to: string;
    try {
      to = toBdMsisdn(order.customerPhone);
    } catch (err) {
      console.error(`[sms] bad phone for order ${orderId}`, err);
      return;
    }

    const body = renderSmsTemplate(event, store?.locale ?? "en", {
      store: store?.name ?? "Shop",
      code: formatOrderCode(order.orderCode),
      total: order.total,
    }).slice(0, MAX_BODY);

    const [msg] = await withStoreContext(storeId, (tx) =>
      tx
        .insert(smsMessages)
        .values({ storeId, orderId, toPhone: to, body, event })
        .returning({ id: smsMessages.id })
    );

    try {
      const adapter = createSmsAdapter(active.provider, active.config);
      const { providerMessageId } = await adapter.send({ to, text: body, senderId: active.senderId });
      await withStoreContext(storeId, (tx) =>
        tx
          .update(smsMessages)
          .set({ status: "sent", providerMessageId, updatedAt: new Date() })
          .where(eq(smsMessages.id, msg.id))
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[sms] send failed for order ${orderId} (${event})`, err);
      await withStoreContext(storeId, (tx) =>
        tx
          .update(smsMessages)
          .set({ status: "failed", error, updatedAt: new Date() })
          .where(eq(smsMessages.id, msg.id))
      );
    }
  } catch (err) {
    // The whole notification path is best-effort — never let it bubble.
    console.error(`[sms] sendOrderSms crashed for order ${orderId}`, err);
  }
}
