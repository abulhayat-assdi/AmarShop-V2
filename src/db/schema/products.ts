import { pgTable, uuid, text, numeric, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { categories } from "./categories";
import { productStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// No product-type selector (General/Digital/etc) — SITE_STRUCTURE.md's own
// audited-bug list flags exactly that pattern (a type in the selector
// before its full pricing/delivery flow was built). Digital delivery is
// Phase 4 (PROJECT_PLAN.md §8); until it exists, every product is a plain
// physical product.
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    brand: text("brand"),
    description: text("description"),
    vatPercent: numeric("vat_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    status: productStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_store_slug_idx").on(table.storeId, table.slug),
    index("products_store_id_idx").on(table.storeId),
    index("products_category_id_idx").on(table.categoryId),
  ]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
