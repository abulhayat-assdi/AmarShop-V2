import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { deliveryZones, orderItems, orders, products, productVariants } from "@/db/schema";
import {
  authenticateApi,
  jsonCreated,
  jsonError,
  jsonOk,
  readJson,
  readPage,
} from "@/lib/api/http";
import { orderToDto } from "@/lib/api/dto";
import { loadOrderDto } from "@/lib/api/records";
import { BadField, nonNegInt, optStr, str } from "@/lib/api/validate";
import {
  BD_PHONE_PATTERN,
  createOrderRecords,
  type OrderLine,
} from "@/lib/orders/create";
import { emitWebhook } from "@/lib/webhooks/dispatch";
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
    const conds = [eq(orders.storeId, ctx.storeId), isNull(orders.quotaLockedAt)];
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

type LineInput = { variantId: string; quantity: number };

// POST /api/v1/orders — record an order the same way staff manual entry
// does (src/lib/orders/create.ts). Cash-on-delivery only for now. Body:
// { customer: { name, phone, address, email? }, lines: [{ variantId,
// quantity }], deliveryZoneId, notes? }. Counts against the plan's
// monthly order quota exactly like every other order.
export async function POST(req: Request) {
  const ctx = await authenticateApi(req, "write:orders");
  if (!("storeId" in ctx)) return ctx;

  const body = await readJson(req);
  if (!body) return jsonError(400, "bad_request", "Send a JSON object body.");

  const customer = (body.customer ?? {}) as Record<string, unknown>;
  let name: string;
  let phone: string;
  let address: string;
  let email: string | null;
  let notes: string | null;
  let deliveryZoneId: string;
  let lines: LineInput[];
  try {
    name = str(customer.name, "customer.name", 200);
    phone = str(customer.phone, "customer.phone", 20);
    if (!BD_PHONE_PATTERN.test(phone)) {
      return jsonError(400, "bad_request", "`customer.phone` must be a Bangladeshi mobile number.");
    }
    address = str(customer.address, "customer.address", 500);
    email = optStr(customer.email, "customer.email", 200);
    notes = optStr(body.notes, "notes", 2000);
    deliveryZoneId = str(body.deliveryZoneId, "deliveryZoneId", 64);

    const method = "paymentMethod" in body ? String(body.paymentMethod) : "cod";
    if (method !== "cod") {
      return jsonError(400, "bad_request", "Only `paymentMethod: \"cod\"` is supported.");
    }

    const rawLines = body.lines;
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return jsonError(400, "bad_request", "`lines` must be a non-empty array.");
    }
    lines = rawLines.map((l, i) => {
      const o = (l ?? {}) as Record<string, unknown>;
      const q = nonNegInt(o.quantity, `lines[${i}].quantity`);
      if (q < 1) throw new BadField(`lines[${i}].quantity must be at least 1.`);
      return { variantId: str(o.variantId, `lines[${i}].variantId`, 64), quantity: q };
    });
  } catch (e) {
    if (e instanceof BadField) return jsonError(400, "bad_request", e.message);
    throw e;
  }

  let result:
    | { code: 400; reason: string; message: string }
    | { code: 201; orderId: string; dto: NonNullable<Awaited<ReturnType<typeof loadOrderDto>>> };
  try {
    result = await withStoreContext(ctx.storeId, async (tx) => {
    const variantRows = await tx
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        productName: products.name,
        isDigital: products.isDigital,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(productVariants.storeId, ctx.storeId),
          eq(products.status, "active"),
          inArray(
            productVariants.id,
            lines.map((l) => l.variantId)
          )
        )
      );
    const byId = new Map(variantRows.map((v) => [v.id, v]));

    const orderLines: OrderLine[] = [];
    for (const line of lines) {
      const v = byId.get(line.variantId);
      if (!v) return { code: 400 as const, reason: "invalid_line", message: `Unknown or inactive variant: ${line.variantId}.` };
      orderLines.push({
        variantId: v.id,
        productName: v.productName,
        sku: v.sku,
        unitPrice: String(v.discountedPrice ?? v.price),
        quantity: line.quantity,
        isDigital: v.isDigital,
      });
    }

    const [zone] = await tx
      .select()
      .from(deliveryZones)
      .where(and(eq(deliveryZones.storeId, ctx.storeId), eq(deliveryZones.id, deliveryZoneId)))
      .limit(1);
    if (!zone) return { code: 400 as const, reason: "invalid_zone", message: "`deliveryZoneId` is not a zone in this store." };

    const subtotal = orderLines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);
    const deliveryCharge = Number(zone.charge);

    // An out-of-stock throw from createOrderRecords rolls the whole
    // transaction back — it's caught OUTSIDE withStoreContext so no
    // half-written order commits.
    const order = await createOrderRecords(tx, {
      storeId: ctx.storeId,
      cartId: null,
      lines: orderLines,
      deliveryZoneId: zone.id,
      deliveryCharge,
      subtotal,
      total: subtotal + deliveryCharge,
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      customerEmail: email,
      notes,
      paymentMethod: "cod",
      paymentStatus: "pending",
      tranId: randomUUID(),
    });

    const dto = await loadOrderDto(tx, ctx.storeId, order.id);
    return { code: 201 as const, orderId: order.id, dto: dto! };
    });
  } catch (err) {
    if ((err as { isOutOfStock?: boolean } | null)?.isOutOfStock) {
      return jsonError(409, "out_of_stock", (err as Error).message);
    }
    throw err;
  }

  if (result.code === 400) return jsonError(400, result.reason, result.message);

  after(() => emitWebhook(ctx.storeId, "order.created", { orderId: result.orderId }));
  return jsonCreated(result.dto);
}
