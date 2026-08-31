import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders, orderItems } from "@/db/schema";
import { authenticateApi, jsonError, jsonOk, readPage } from "@/lib/api/http";
import { orderToDto } from "@/lib/api/dto";
import { ORDER_STATUSES } from "@/lib/enum-labels";

export async function GET(req: Request) {
  const ctx = await authenticateApi(req, "read:orders");
  if (!("storeId" in ctx)) return ctx;

  const { page, limit, offset } = readPage(req.url);
  const status = new URL(req.url).searchParams.get("status");
  if (status && !(ORDER_STATUSES as string[]).includes(status)) {
    return jsonError(400, "bad_request", "Unknown `status` value.");
  }

  const data = await withStoreContext(ctx.storeId, async (tx) => {
    const conds = [
      eq(orders.storeId, ctx.storeId),
      // Over-quota (locked) orders are hidden from the merchant's admin —
      // the API doesn't expose them either, or the quota paywall is moot.
      isNull(orders.quotaLockedAt),
    ];
    if (status) conds.push(eq(orders.status, status as (typeof ORDER_STATUSES)[number]));

    const rows = await tx
      .select()
      .from(orders)
      .where(and(...conds))
      .orderBy(desc(orders.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const pageRows = rows.slice(0, limit);
    const ids = pageRows.map((o) => o.id);
    const items = ids.length
      ? await tx
          .select()
          .from(orderItems)
          .where(and(eq(orderItems.storeId, ctx.storeId), inArray(orderItems.orderId, ids)))
      : [];

    const byOrder = new Map<string, typeof items>();
    for (const it of items) {
      const list = byOrder.get(it.orderId) ?? [];
      list.push(it);
      byOrder.set(it.orderId, list);
    }

    return {
      dtos: pageRows.map((o) => orderToDto(o, byOrder.get(o.id) ?? [])),
      hasMore: rows.length > limit,
    };
  });

  return jsonOk(data.dtos, { page, limit, hasMore: data.hasMore });
}
