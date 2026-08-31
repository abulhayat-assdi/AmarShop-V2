import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { products, productVariants } from "@/db/schema";
import { authenticateApi, jsonError, jsonOk, readJson } from "@/lib/api/http";
import { loadProductDto } from "@/lib/api/records";
import { BadField, money, nonNegInt } from "@/lib/api/validate";

// PATCH /api/v1/variants/{id} — body { quantity?, price?, discountedPrice? }.
// `quantity` (the stock-sync case) is rejected for a digital product's
// variant. `discountedPrice` must stay below the effective price, and an
// explicit null clears it. Returns the parent ProductDto so the caller
// sees every variant.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(req, "write:products");
  if (!("storeId" in ctx)) return ctx;
  const { id } = await params;

  const body = await readJson(req);
  if (!body) return jsonError(400, "bad_request", "Send a JSON object body.");

  const hasQ = "quantity" in body;
  const hasP = "price" in body;
  const hasD = "discountedPrice" in body;
  if (!hasQ && !hasP && !hasD) {
    return jsonError(400, "bad_request", "Provide quantity, price, and/or discountedPrice.");
  }

  const out = await withStoreContext(ctx.storeId, async (tx) => {
    const [row] = await tx
      .select({
        productId: productVariants.productId,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        isDigital: products.isDigital,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(productVariants.storeId, ctx.storeId), eq(productVariants.id, id)))
      .limit(1);
    if (!row) return { code: 404 as const };

    const set: { quantity?: number; price?: string; discountedPrice?: string | null } = {};
    try {
      if (hasQ) {
        if (row.isDigital) {
          return {
            code: 409 as const,
            reason: "not_applicable",
            message: "This is a digital product — its variant has no stock.",
          };
        }
        set.quantity = nonNegInt(body.quantity, "quantity");
      }
      if (hasP) set.price = money(body.price, "price");
      if (hasD) {
        set.discountedPrice = body.discountedPrice == null ? null : money(body.discountedPrice, "discountedPrice");
      }
    } catch (e) {
      if (e instanceof BadField) return { code: 400 as const, message: e.message };
      throw e;
    }

    const finalPrice = set.price ?? row.price;
    const finalDiscount = hasD ? set.discountedPrice : row.discountedPrice;
    if (finalDiscount != null && Number(finalDiscount) >= Number(finalPrice)) {
      return { code: 400 as const, message: "`discountedPrice` must be less than `price`." };
    }

    await tx
      .update(productVariants)
      .set({ ...set, updatedAt: new Date() })
      .where(and(eq(productVariants.storeId, ctx.storeId), eq(productVariants.id, id)));

    const dto = await loadProductDto(tx, ctx.storeId, row.productId);
    return { code: 200 as const, dto: dto! };
  });

  if (out.code === 404) return jsonError(404, "not_found", "No variant with that id.");
  if (out.code === 409) return jsonError(409, out.reason, out.message);
  if (out.code === 400) return jsonError(400, "bad_request", out.message);
  return jsonOk(out.dto);
}
