import { and, eq, or, ilike, sql, desc, asc } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { products, productVariants } from "@/db/schema";
import type { ProductCardData } from "@/components/storefront-chrome";
import { getPrimaryImageUrls } from "./media";
import type { SearchSort } from "./search-constants";

export { SEARCH_SORTS, SEARCH_SORT_LABELS, parseSort, type SearchSort } from "./search-constants";

// Escape LIKE/ILIKE metacharacters so a term like "50%" is matched
// literally. `\` is Postgres's default ESCAPE for ILIKE.
function likeEscape(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type SearchResult = {
  items: ProductCardData[];
  total: number;
};

// Storefront product search — store-scoped, active products only. Plain
// ILIKE across name/sku/brand/description; fine at Phase 1 catalogue sizes
// (tsvector ranking is a later refinement). Not live/instant — the caller
// is a full page render.
export async function searchProducts(
  storeId: string,
  { query, sort, limit }: { query: string; sort: SearchSort; limit: number }
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { items: [], total: 0 };

  const term = `%${likeEscape(q)}%`;
  const prefixTerm = `${likeEscape(q)}%`;

  const where = and(
    eq(products.storeId, storeId),
    eq(products.status, "active"),
    or(
      ilike(products.name, term),
      ilike(products.brand, term),
      ilike(products.description, term),
      ilike(productVariants.sku, term)
    )
  );

  const priceExpr = sql`coalesce(${productVariants.discountedPrice}, ${productVariants.price})`;
  const orderBy =
    sort === "price_asc"
      ? [asc(priceExpr)]
      : sort === "price_desc"
        ? [desc(priceExpr)]
        : sort === "newest"
          ? [desc(products.createdAt)]
          : [
              // relevance: exact-prefix name matches first, then any name
              // match, then newest.
              desc(sql`(${products.name} ilike ${prefixTerm})`),
              desc(sql`(${products.name} ilike ${term})`),
              desc(products.createdAt),
            ];

  const { items, total } = await withStoreContext(storeId, async (tx) => {
    const rows = await tx
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
      })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit);

    const [{ n }] = await tx
      .select({ n: sql<number>`count(distinct ${products.id})::int` })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(where);

    return { items: rows, total: n };
  });

  const imageUrls = await getPrimaryImageUrls(
    storeId,
    items.map((item) => item.id)
  );

  return {
    items: items.map((item) => ({ ...item, imageUrl: imageUrls[item.id] ?? null })),
    total,
  };
}
