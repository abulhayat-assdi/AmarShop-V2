import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export default async function CreateProductPage() {
  const session = await requireStaffSession();

  const categoryRows = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, session.user.storeId))
  );

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add product</h1>
      <ProductForm action={createProduct} categories={categoryRows} submitLabel="Create product" />
    </div>
  );
}
