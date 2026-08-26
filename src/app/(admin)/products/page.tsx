import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { products, productVariants, categories } from "@/db/schema";

export default async function ProductsPage() {
  const session = await requireStaffSession();

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link
          href="/products/create"
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Add product
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Name</th>
            <th className="py-2">Category</th>
            <th className="py-2">Price</th>
            <th className="py-2">Stock</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-gray-500">
                No products yet.
              </td>
            </tr>
          ) : (
            rows.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="py-2">{product.name}</td>
                <td className="py-2 text-gray-500">{product.categoryName ?? "—"}</td>
                <td className="py-2">৳{product.price}</td>
                <td className="py-2">{product.quantity}</td>
                <td className="py-2 text-gray-500">{product.status}</td>
                <td className="py-2">
                  <Link href={`/products/${product.id}/edit`} className="underline">
                    Edit
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
