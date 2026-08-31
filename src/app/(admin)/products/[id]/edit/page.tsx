import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { categories, products, productVariants, stores } from "@/db/schema";
import { getProductMedia } from "@/lib/products/media";
import { getDigitalFiles } from "@/lib/products/digital";
import { getTranslator } from "@/lib/i18n/server";
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
  const [store] = await db
    .select({ digitalEnabled: stores.digitalEnabled })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const digitalFiles = store?.digitalEnabled
    ? await getDigitalFiles(session.user.storeId, product.id)
    : [];
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.products.editTitle")}</h1>
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        categories={categoryRows}
        submitLabel={t("admin.products.saveChanges")}
        productId={product.id}
        existingMedia={media.map((m) => ({ id: m.id, kind: m.kind, url: m.url }))}
        digitalAllowed={store?.digitalEnabled ?? false}
        existingDigitalFiles={digitalFiles}
        initialValues={{
          name: product.name,
          categoryId: product.categoryId ?? "",
          brand: product.brand ?? "",
          description: product.description ?? "",
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          vatPercent: product.vatPercent,
          sku: variant.sku,
          price: variant.price,
          discountedPrice: variant.discountedPrice ?? "",
          quantity: String(variant.quantity),
          isDigital: product.isDigital,
        }}
      />
    </div>
  );
}
