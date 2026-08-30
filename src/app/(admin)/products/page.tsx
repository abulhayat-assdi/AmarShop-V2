import Link from "next/link";
import { and, eq, lte } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { products, productVariants, categories, stores } from "@/db/schema";
import { getPrimaryImageUrls } from "@/lib/products/media";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/products/stock";
import { ProductMedia } from "@/components/product-media";
import { getTranslator } from "@/lib/i18n/server";
import { PRODUCT_STATUS_KEYS } from "@/lib/enum-labels";
import { setLowStockThreshold } from "./actions";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ stock?: string }>;
}) {
  const session = await requireStaffSession();
  const { t } = await getTranslator();
  const { stock } = await searchParams;
  const lowOnly = stock === "low";

  const [store] = await db
    .select({ lowStockThreshold: stores.lowStockThreshold })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const threshold = store?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

  const rows = await withStoreContext(session.user.storeId, (tx) => {
    const conditions = [eq(products.storeId, session.user.storeId)];
    if (lowOnly) conditions.push(lte(productVariants.quantity, threshold));
    return tx
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
      .where(and(...conditions));
  });

  const imageUrls = await getPrimaryImageUrls(
    session.user.storeId,
    rows.map((row) => row.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("admin.products.title")}</h1>
        <div className="flex items-center gap-3">
          <Link href="/products/import" className="text-sm underline">
            {t("admin.products.importCsv")}
          </Link>
          <Link
            href="/products/create"
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            {t("admin.products.addProduct")}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <form action={setLowStockThreshold} className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            {t("admin.products.lowStockThreshold")}
            <input
              type="number"
              name="threshold"
              min={0}
              max={100000}
              defaultValue={threshold}
              className="w-20 rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <button
            type="submit"
            className="rounded border border-black px-3 py-1 hover:bg-gray-100"
          >
            {t("admin.common.save")}
          </button>
        </form>
        <Link
          href={lowOnly ? "/products" : "/products?stock=low"}
          className="underline"
        >
          {lowOnly
            ? t("admin.products.stockFilterAll")
            : t("admin.products.stockFilterLow")}
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
            rows.map((product) => {
              const qty = product.quantity ?? 0;
              return (
                <tr key={product.id} className="border-b">
                  <td className="py-2">
                    <ProductMedia
                      item={null}
                      src={imageUrls[product.id] ?? null}
                      className="w-10"
                    />
                  </td>
                  <td className="py-2">{product.name}</td>
                  <td className="py-2 text-gray-500">
                    {product.categoryName ?? t("admin.common.none")}
                  </td>
                  <td className="py-2">৳{product.price}</td>
                  <td
                    className={`py-2 ${
                      qty === 0
                        ? "text-red-600"
                        : qty <= threshold
                          ? "text-amber-600"
                          : ""
                    }`}
                  >
                    {product.quantity}
                  </td>
                  <td className="py-2 text-gray-500">
                    {t(PRODUCT_STATUS_KEYS[product.status])}
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="underline"
                    >
                      {t("admin.common.edit")}
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
