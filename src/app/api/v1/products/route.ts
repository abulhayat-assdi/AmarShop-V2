import { and, desc, eq, inArray } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { authenticateApi, jsonError, jsonOk, readPage } from "@/lib/api/http";
import { productToDto } from "@/lib/api/dto";
import { PRODUCT_STATUSES } from "@/lib/enum-labels";

export async function GET(req: Request) {
  const ctx = await authenticateApi(req, "read:products");
  if (!("storeId" in ctx)) return ctx;

  const { page, limit, offset } = readPage(req.url);
  const status = new URL(req.url).searchParams.get("status");
  if (status && !(PRODUCT_STATUSES as string[]).includes(status)) {
    return jsonError(400, "bad_request", "Unknown `status` value.");
  }

  const data = await withStoreContext(ctx.storeId, async (tx) => {
    const conds = [eq(products.storeId, ctx.storeId)];
    if (status) conds.push(eq(products.status, status as (typeof PRODUCT_STATUSES)[number]));

    const rows = await tx
      .select({ product: products, categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(...conds))
      .orderBy(desc(products.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const pageRows = rows.slice(0, limit);
    const ids = pageRows.map((r) => r.product.id);
    const variants = ids.length
      ? await tx
          .select()
          .from(productVariants)
          .where(
            and(eq(productVariants.storeId, ctx.storeId), inArray(productVariants.productId, ids))
          )
      : [];

    const byProduct = new Map<string, typeof variants>();
    for (const v of variants) {
      const list = byProduct.get(v.productId) ?? [];
      list.push(v);
      byProduct.set(v.productId, list);
    }

    return {
      dtos: pageRows.map((r) =>
        productToDto(
          r.product,
          byProduct.get(r.product.id) ?? [],
          r.product.categoryId && r.categoryName
            ? { id: r.product.categoryId, name: r.categoryName }
            : null
        )
      ),
      hasMore: rows.length > limit,
    };
  });

  return jsonOk(data.dtos, { page, limit, hasMore: data.hasMore });
}
