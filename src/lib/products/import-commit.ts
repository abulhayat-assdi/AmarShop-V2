import { and, eq, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { uniqueSlug } from "@/lib/slugify";
import type { NormalizedProduct } from "./import";

export type CommitResult = {
  created: number;
  skippedExistingSku: number;
  newCategories: string[];
};

// Writes every valid row in ONE transaction. A unique-index violation mid
// commit (a SKU/slug that slipped past the preview) rolls the whole import
// back and rethrows with the offending line number attached, so the caller
// can report it. Auto-creates unknown categories (user decision).
export async function commitImport(
  storeId: string,
  rows: NormalizedProduct[]
): Promise<CommitResult> {
  return withStoreContext(storeId, async (tx) => {
    // Existing categories: lower(name) -> id. Existing SKUs: a lookup set.
    const existingCats = await tx
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, storeId));
    const catByName = new Map(existingCats.map((c) => [c.name.trim().toLowerCase(), c.id]));

    const existingSkus = new Set(
      (
        await tx
          .select({ sku: productVariants.sku })
          .from(productVariants)
          .where(eq(productVariants.storeId, storeId))
      ).map((r) => r.sku.toLowerCase())
    );

    const newCategories: string[] = [];
    let created = 0;
    let skippedExistingSku = 0;

    const categorySlugTaken = async (candidate: string) => {
      const [hit] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.storeId, storeId), eq(categories.slug, candidate)))
        .limit(1);
      return Boolean(hit);
    };
    const productSlugTaken = async (candidate: string) => {
      const [hit] = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.slug, candidate)))
        .limit(1);
      return Boolean(hit);
    };

    for (const row of rows) {
      if (existingSkus.has(row.sku.toLowerCase())) {
        skippedExistingSku += 1;
        continue;
      }

      let categoryId: string | null = null;
      if (row.categoryName) {
        const key = row.categoryName.trim().toLowerCase();
        categoryId = catByName.get(key) ?? null;
        if (!categoryId) {
          const slug = await uniqueSlug(row.categoryName, categorySlugTaken);
          const [cat] = await tx
            .insert(categories)
            .values({ storeId, name: row.categoryName, slug })
            .returning({ id: categories.id });
          categoryId = cat.id;
          catByName.set(key, cat.id);
          newCategories.push(row.categoryName);
        }
      }

      const slug = await uniqueSlug(row.name, productSlugTaken);

      try {
        const [product] = await tx
          .insert(products)
          .values({
            storeId,
            categoryId,
            name: row.name,
            slug,
            brand: row.brand,
            description: row.description,
            vatPercent: row.vatPercent,
            status: row.status,
          })
          .returning({ id: products.id });

        await tx.insert(productVariants).values({
          storeId,
          productId: product.id,
          sku: row.sku,
          price: row.price,
          discountedPrice: row.discountedPrice,
          quantity: row.quantity,
        });
      } catch (err) {
        const cause = (err as { cause?: { code?: string } } | null)?.cause;
        if (cause?.code === "23505") {
          throw Object.assign(new Error(`row conflict at line ${row.line}`), {
            isRowConflict: true,
            line: row.line,
          });
        }
        throw err;
      }

      existingSkus.add(row.sku.toLowerCase());
      created += 1;
    }

    return { created, skippedExistingSku, newCategories };
  });
}

// Which of these SKUs already exist in the store — for the preview only
// (the real gate is inside commitImport's transaction).
export async function existingSkuSet(storeId: string, skus: string[]): Promise<Set<string>> {
  if (skus.length === 0) return new Set();
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({ sku: productVariants.sku })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.storeId, storeId),
          sql`lower(${productVariants.sku}) = any(${skus.map((s) => s.toLowerCase())})`
        )
      )
  );
  return new Set(rows.map((r) => r.sku.toLowerCase()));
}
