import { and, eq, isNull } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import { categories, orders, orderItems, products, productVariants } from "@/db/schema";
import { orderToDto, productToDto, type OrderDto, type ProductDto } from "./dto";

// Load-and-shape helpers shared by the /api/v1 GET and write routes — one
// place that knows how to turn a store-scoped id into its public DTO.
// Both run inside a caller-provided withStoreContext transaction.

// null = no such order in this store, or it's quota-locked (hidden from
// the merchant, so hidden from the API too).
export async function loadOrderDto(
  tx: TenantTx,
  storeId: string,
  orderId: string
): Promise<OrderDto | null> {
  const [order] = await tx
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, storeId), eq(orders.id, orderId), isNull(orders.quotaLockedAt)))
    .limit(1);
  if (!order) return null;

  const items = await tx
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, orderId)));

  return orderToDto(order, items);
}

// null = no such product in this store.
export async function loadProductDto(
  tx: TenantTx,
  storeId: string,
  productId: string
): Promise<ProductDto | null> {
  const [row] = await tx
    .select({ product: products, categoryName: categories.name })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.storeId, storeId), eq(products.id, productId)))
    .limit(1);
  if (!row) return null;

  const variants = await tx
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.storeId, storeId), eq(productVariants.productId, productId)));

  return productToDto(
    row.product,
    variants,
    row.product.categoryId && row.categoryName
      ? { id: row.product.categoryId, name: row.categoryName }
      : null
  );
}
