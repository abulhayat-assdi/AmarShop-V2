import { pgTable, uuid, text, integer, numeric, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products } from "./products";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// storeId is redundant with products.storeId (reachable via productId) but
// kept as its own column so the RLS policy here is a plain column check
// like every other table's, not a join back to products.
//
// Every product has at least one variant, Shopify-style — even a "simple"
// product with no color/size options is one variant with optionsLabel
// null. This slice's admin form only ever creates that single variant;
// a real color/size matrix builder is a later addition on top of this
// same table, not a schema change.
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    optionsLabel: text("options_label"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    discountedPrice: numeric("discounted_price", { precision: 12, scale: 2 }),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }),
    quantity: integer("quantity").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_variants_store_sku_idx").on(table.storeId, table.sku),
    index("product_variants_store_id_idx").on(table.storeId),
    index("product_variants_product_id_idx").on(table.productId),
  ]
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
