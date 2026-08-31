import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { categories, stores } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export default async function CreateProductPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const categoryRows = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, session.user.storeId))
  );
  const [store] = await db
    .select({ digitalEnabled: stores.digitalEnabled })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.products.addTitle")}</h1>
      <ProductForm
        action={createProduct}
        categories={categoryRows}
        submitLabel={t("admin.products.createProduct")}
        digitalAllowed={store?.digitalEnabled ?? false}
      />
    </div>
  );
}
