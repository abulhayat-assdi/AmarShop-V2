import { and, eq, isNull } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { orders, orderItems } from "@/db/schema";
import { authenticateApi, jsonError, jsonOk } from "@/lib/api/http";
import { orderToDto } from "@/lib/api/dto";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(req, "read:orders");
  if (!("storeId" in ctx)) return ctx;
  const { id } = await params;

  const dto = await withStoreContext(ctx.storeId, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.storeId, ctx.storeId),
          eq(orders.id, id),
          isNull(orders.quotaLockedAt)
        )
      )
      .limit(1);
    if (!order) return null;

    const items = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.storeId, ctx.storeId), eq(orderItems.orderId, id)));

    return orderToDto(order, items);
  });

  if (!dto) return jsonError(404, "not_found", "No order with that id.");
  return jsonOk(dto);
}
