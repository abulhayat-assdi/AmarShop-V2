import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { products, productVariants, deliveryZones } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { ManualOrderForm } from "./ManualOrderForm";

export default async function CreateOrderPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const { productRows, zoneRows } = await withStoreContext(session.user.storeId, async (tx) => {
    const productRows = await tx
      .select({
        variantId: productVariants.id,
        productName: products.name,
        sku: productVariants.sku,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        available: productVariants.quantity,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(eq(productVariants.storeId, session.user.storeId), eq(products.status, "active"))
      )
      .orderBy(products.name);

    const zoneRows = await tx
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.storeId, session.user.storeId))
      .orderBy(deliveryZones.displayOrder);

    return { productRows, zoneRows };
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.orders.newOrder")}</h1>
      <ManualOrderForm products={productRows} zones={zoneRows} />
    </div>
  );
}
