import { pgTable, uuid, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { carts } from "./carts";
import { productVariants } from "./product-variants";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// storeId is redundant with carts.storeId (reachable via cartId) but kept
// as its own column so the RLS policy here is a plain column check, same
// reasoning as product_variants.storeId.
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Re-adding the same variant increments this row instead of duplicating.
    uniqueIndex("cart_items_cart_variant_idx").on(table.cartId, table.productVariantId),
    index("cart_items_store_id_idx").on(table.storeId),
    index("cart_items_cart_id_idx").on(table.cartId),
  ]
);

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
