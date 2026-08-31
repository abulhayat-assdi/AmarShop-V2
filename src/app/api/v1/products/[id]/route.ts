import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { authenticateApi, jsonError, jsonOk } from "@/lib/api/http";
import { productToDto } from "@/lib/api/dto";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApi(req, "read:products");
  if (!("storeId" in ctx)) return ctx;
  const { id } = await params;

  const dto = await withStoreContext(ctx.storeId, async (tx) => {
    const [row] = await tx
      .select({ product: products, categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(products.storeId, ctx.storeId), eq(products.id, id)))
      .limit(1);
    if (!row) return null;

    const variants = await tx
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.storeId, ctx.storeId), eq(productVariants.productId, id)));

    return productToDto(
      row.product,
      variants,
      row.product.categoryId && row.categoryName
        ? { id: row.product.categoryId, name: row.categoryName }
        : null
    );
  });

  if (!dto) return jsonError(404, "not_found", "No product with that id.");
  return jsonOk(dto);
}
