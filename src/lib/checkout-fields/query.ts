import { and, asc, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { checkoutCustomFields, type CheckoutCustomField } from "@/db/schema";

export async function listCheckoutFields(storeId: string): Promise<CheckoutCustomField[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(checkoutCustomFields)
      .where(eq(checkoutCustomFields.storeId, storeId))
      .orderBy(asc(checkoutCustomFields.displayOrder), asc(checkoutCustomFields.createdAt))
  );
}

// Storefront checkout's read — active fields only, in order.
export async function listActiveCheckoutFields(storeId: string): Promise<CheckoutCustomField[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(checkoutCustomFields)
      .where(and(eq(checkoutCustomFields.storeId, storeId), eq(checkoutCustomFields.active, true)))
      .orderBy(asc(checkoutCustomFields.displayOrder), asc(checkoutCustomFields.createdAt))
  );
}
