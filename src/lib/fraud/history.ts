import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders } from "@/db/schema";
import { BD_PHONE_PATTERN } from "@/lib/phone";
import { createFraudCheckAdapter } from "./index";
import { parseFraudVerdict, type FraudCheckResult, type FraudRiskLevel } from "./types";

export type FraudHistoryRow = {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  riskLevel: FraudRiskLevel | null;
  successRatio: string | null;
  checkedAt: Date;
  verdict: string | null;
};

export type FraudHistoryOpts = {
  query?: string;
  risk?: FraudRiskLevel;
  limit: number;
  offset: number;
};

// Every COD order that's had a fraud check run (fraud_checked_at set),
// newest check first, optionally narrowed by an order-code / phone
// substring and/or a risk level. Quota-locked orders are excluded, like
// everywhere else in the admin.
export async function listFraudChecks(
  storeId: string,
  opts: FraudHistoryOpts
): Promise<{ rows: FraudHistoryRow[]; total: number }> {
  const conditions = [
    eq(orders.storeId, storeId),
    isNull(orders.quotaLockedAt),
    isNotNull(orders.fraudCheckedAt),
  ];

  const q = opts.query?.trim();
  if (q) {
    const like = `%${q}%`;
    conditions.push(or(ilike(orders.orderCode, like), ilike(orders.customerPhone, like))!);
  }
  if (opts.risk) {
    conditions.push(eq(orders.fraudRiskLevel, opts.risk));
  }

  return withStoreContext(storeId, async (tx) => {
    const where = and(...conditions);

    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(orders)
      .where(where);

    const rows = await tx
      .select({
        orderId: orders.id,
        orderCode: orders.orderCode,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        riskLevel: orders.fraudRiskLevel,
        successRatio: orders.fraudSuccessRatio,
        checkedAt: orders.fraudCheckedAt,
        fraudRaw: orders.fraudRaw,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.fraudCheckedAt))
      .limit(opts.limit)
      .offset(opts.offset);

    return {
      total,
      rows: rows.map((r) => ({
        orderId: r.orderId,
        orderCode: r.orderCode,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        riskLevel: r.riskLevel,
        successRatio: r.successRatio,
        checkedAt: r.checkedAt as Date,
        verdict: parseFraudVerdict(r.fraudRaw),
      })),
    };
  });
}

// Normalise "+8801…", "8801…", "01…" (and spaces/dashes) to the local
// 01XXXXXXXXX form the adapters expect.
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("880")) local = local.slice(3);
  if (local.length === 10 && local.startsWith("1")) local = `0${local}`;
  return BD_PHONE_PATTERN.test(local) ? local : null;
}

export type AdHocResult =
  | { ok: FraudCheckResult }
  | { error: "phone" | "unavailable" };

// A transient lookup for a phone that isn't (yet) an order — the "checker"
// half of /fraud-checker. Not persisted anywhere (no order to hang it
// off); the merchant just sees the verdict. Never throws.
export async function adHocFraudCheck(rawPhone: string): Promise<AdHocResult> {
  const phone = normalizeBdPhone(rawPhone);
  if (!phone) return { error: "phone" };
  try {
    const result = await createFraudCheckAdapter().check(phone);
    return { ok: result };
  } catch (err) {
    console.error("[fraud:adhoc] failed", err);
    return { error: "unavailable" };
  }
}
