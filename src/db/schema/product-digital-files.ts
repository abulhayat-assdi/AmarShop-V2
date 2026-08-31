import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products } from "./products";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// The PDF file(s) that make up a digital product's delivery. Uploaded on
// the product form (src/lib/products/digital.ts), streamed to the buyer
// after purchase by src/app/(storefront)/order/[tranId]/download/[fileId].
// contentType is always application/pdf. storageKey is the storage
// adapter's key (src/lib/storage), never a public URL.
export const productDigitalFiles = pgTable(
  "product_digital_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_digital_files_store_id_idx").on(table.storeId),
    index("product_digital_files_product_id_idx").on(table.productId),
  ]
);

export type ProductDigitalFile = typeof productDigitalFiles.$inferSelect;
export type NewProductDigitalFile = typeof productDigitalFiles.$inferInsert;
