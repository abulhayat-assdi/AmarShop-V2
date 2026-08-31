import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { products } from "@/db/schema";
import { authenticateApi, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { loadProductDto } from "@/lib/api/records";
import { BadField, oneOf, optStr, str } from "@/lib/api/validate";
import { PRODUCT_STATUSES } from "@/lib/enum-labels";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(req, "read:products");
  if (!("storeId" in ctx)) return ctx;
  const { id } = await params;

  const dto = await withStoreContext(ctx.storeId, (tx) => loadProductDto(tx, ctx.storeId, id));
  if (!dto) return jsonError(404, "not_found", "No product with that id.");
  return jsonOk(dto);
}

// PATCH /api/v1/products/{id} — body { status?, name?, brand?, description? }.
// Slug is never re-derived from a renamed product (URL stability). Stock
// and price live on the variant — see PATCH /variants/{id}.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(req, "write:products");
  if (!("storeId" in ctx)) return ctx;
  const { id } = await params;

  const body = await readJson(req);
  if (!body) return jsonError(400, "bad_request", "Send a JSON object body.");

  const patch: {
    status?: (typeof PRODUCT_STATUSES)[number];
    name?: string;
    brand?: string | null;
    description?: string | null;
  } = {};
  try {
    if ("status" in body) patch.status = oneOf(body.status, "status", PRODUCT_STATUSES);
    if ("name" in body) patch.name = str(body.name, "name", 200);
    if ("brand" in body) patch.brand = optStr(body.brand, "brand", 120);
    if ("description" in body) patch.description = optStr(body.description, "description", 5000);
  } catch (e) {
    if (e instanceof BadField) return jsonError(400, "bad_request", e.message);
    throw e;
  }
  if (Object.keys(patch).length === 0) {
    return jsonError(400, "bad_request", "Provide at least one of: status, name, brand, description.");
  }

  const dto = await withStoreContext(ctx.storeId, async (tx) => {
    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.storeId, ctx.storeId), eq(products.id, id)))
      .limit(1);
    if (!existing) return null;

    await tx
      .update(products)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(products.storeId, ctx.storeId), eq(products.id, id)));

    return loadProductDto(tx, ctx.storeId, id);
  });

  if (!dto) return jsonError(404, "not_found", "No product with that id.");
  return jsonOk(dto);
}
