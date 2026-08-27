import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants } from "@/db/schema";
import { getProductMedia } from "@/lib/products/media";
import { ProductForm } from "../../ProductForm";
import { updateProduct } from "../../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaffSession();

  const { product, variant, categoryRows } = await withStoreContext(session.user.storeId, async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.storeId, session.user.storeId), eq(products.id, id)))
      .limit(1);

    const [variant] = product
      ? await tx
          .select()
          .from(productVariants)
          .where(
            and(eq(productVariants.storeId, session.user.storeId), eq(productVariants.productId, id))
          )
          .limit(1)
      : [];

    const categoryRows = await tx
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, session.user.storeId));

    return { product, variant, categoryRows };
  });

  if (!product || !variant) {
    notFound();
  }

  const media = await getProductMedia(session.user.storeId, product.id);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit product</h1>
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        categories={categoryRows}
        submitLabel="Save changes"
        productId={product.id}
        existingMedia={media.map((m) => ({ id: m.id, kind: m.kind, url: m.url }))}
        initialValues={{
          name: product.name,
          categoryId: product.categoryId ?? "",
          brand: product.brand ?? "",
          description: product.description ?? "",
          vatPercent: product.vatPercent,
          sku: variant.sku,
          price: variant.price,
          discountedPrice: variant.discountedPrice ?? "",
          quantity: String(variant.quantity),
        }}
      />
    </div>
  );
}
