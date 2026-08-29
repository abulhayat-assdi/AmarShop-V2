import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { products, productVariants, categories } from "@/db/schema";
import { getPrimaryImageUrls } from "@/lib/products/media";
import { ProductMedia } from "@/components/product-media";
import { getTranslator } from "@/lib/i18n/server";
import { PRODUCT_STATUS_KEYS } from "@/lib/enum-labels";

export default async function ProductsPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({
        id: products.id,
        name: products.name,
        status: products.status,
        categoryName: categories.name,
        price: productVariants.price,
        quantity: productVariants.quantity,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(eq(products.storeId, session.user.storeId))
  );

  const imageUrls = await getPrimaryImageUrls(
    session.user.storeId,
    rows.map((row) => row.id)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("admin.products.title")}</h1>
        <Link
          href="/products/create"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t("admin.products.addProduct")}
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2" />
            <th className="py-2">{t("admin.products.colName")}</th>
            <th className="py-2">{t("admin.products.colCategory")}</th>
            <th className="py-2">{t("admin.products.colPrice")}</th>
            <th className="py-2">{t("admin.products.colStock")}</th>
            <th className="py-2">{t("admin.products.colStatus")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-gray-500">
                {t("admin.products.noProducts")}
              </td>
            </tr>
          ) : (
            rows.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="py-2">
                  <ProductMedia item={null} src={imageUrls[product.id] ?? null} className="w-10" />
                </td>
                <td className="py-2">{product.name}</td>
                <td className="py-2 text-gray-500">
                  {product.categoryName ?? t("admin.common.none")}
                </td>
                <td className="py-2">৳{product.price}</td>
                <td className="py-2">{product.quantity}</td>
                <td className="py-2 text-gray-500">{t(PRODUCT_STATUS_KEYS[product.status])}</td>
                <td className="py-2">
                  <Link href={`/products/${product.id}/edit`} className="underline">
                    {t("admin.common.edit")}
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
