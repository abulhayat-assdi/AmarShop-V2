import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { getProductMedia } from "@/lib/products/media";
import { ProductMedia } from "@/components/product-media";
import { AddToCartForm } from "./AddToCartForm";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (!store) notFound();

  const product = await withStoreContext(store.id, async (tx) => {
    const [row] = await tx
      .select({
        productId: products.id,
        variantId: productVariants.id,
        name: products.name,
        brand: products.brand,
        description: products.description,
        categoryName: categories.name,
        sku: productVariants.sku,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        quantity: productVariants.quantity,
      })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(
        and(eq(products.storeId, store.id), eq(products.slug, slug), eq(products.status, "active"))
      )
      .limit(1);
    return row;
  });

  if (!product) notFound();

  const media = await getProductMedia(store.id, product.productId);
  const primary = media[0] ?? null;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <ProductMedia item={primary} src={null} alt={product.name} />
        {media.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {media.map((item) => (
              <ProductMedia key={item.id} item={item} alt={product.name} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        {(product.brand || product.categoryName) && (
          <p className="text-sm text-gray-500">
            {[product.brand, product.categoryName].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex items-baseline gap-2">
          {product.discountedPrice ? (
            <>
              <span className="text-xl font-semibold">৳{product.discountedPrice}</span>
              <span className="text-gray-400 line-through">৳{product.price}</span>
            </>
          ) : (
            <span className="text-xl font-semibold">৳{product.price}</span>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
        </p>
        {product.description && <p className="text-gray-700">{product.description}</p>}
        <AddToCartForm productVariantId={product.variantId} maxQuantity={product.quantity} />
      </div>
    </div>
  );
}
