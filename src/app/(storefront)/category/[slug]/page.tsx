import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { ProductCard } from "@/components/storefront-chrome";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (!store) notFound();

  const result = await withStoreContext(store.id, async (tx) => {
    const [category] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.storeId, store.id), eq(categories.slug, slug)))
      .limit(1);

    if (!category) return null;

    const items = await tx
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
      })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(products.storeId, store.id),
          eq(products.categoryId, category.id),
          eq(products.status, "active")
        )
      );

    return { category, items };
  });

  if (!result) notFound();
  const { category, items } = result;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{category.name}</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </div>
  );
}
