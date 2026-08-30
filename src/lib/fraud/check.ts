import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders } from "@/db/schema";
import { createFraudCheckAdapter } from "./index";
import type { FraudRiskLevel } from "./types";

const RAW_MAX = 8000;

// Runs a BDCourier fraud check for one COD order and writes the result
// onto the order row. Never throws (mirrors src/lib/sms/notifications.ts)
// — a fraud-provider hiccup must never affect a placed order. Triggered
// via after() from placeOrder / createManualOrder, and by the admin
// "Re-check" button.
export async function runFraudCheck(storeId: string, orderId: string): Promise<void> {
  try {
    const phone = await withStoreContext(storeId, async (tx) => {
      const [row] = await tx
        .select({ phone: orders.customerPhone })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)))
        .limit(1);
      return row?.phone ?? null;
    });
    if (!phone) return;

    const result = await createFraudCheckAdapter().check(phone);

    await withStoreContext(storeId, (tx) =>
      tx
        .update(orders)
        .set({
          fraudRiskLevel: result.riskLevel,
          fraudSuccessRatio: result.successRatio != null ? String(result.successRatio) : null,
          fraudCheckedAt: new Date(),
          fraudRaw: JSON.stringify({
            provider: result.provider,
            verdict: result.verdict,
            response: result.raw ?? null,
          }).slice(0, RAW_MAX),
          updatedAt: new Date(),
        })
        .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)))
    );
  } catch (err) {
    console.error("[fraud:check] failed", err);
    try {
      await withStoreContext(storeId, (tx) =>
        tx
          .update(orders)
          .set({
            fraudRiskLevel: "unknown" satisfies FraudRiskLevel,
            fraudCheckedAt: new Date(),
            fraudRaw: JSON.stringify({ error: "unavailable" }),
            updatedAt: new Date(),
          })
          .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId)))
      );
    } catch (writeErr) {
      console.error("[fraud:check] could not record failure", writeErr);
    }
  }
}
