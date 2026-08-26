import { pgTable, uuid, text, timestamp, uniqueIndex, index, type AnyPgColumn } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    // Self-referencing for one level of nesting (e.g. "Men's" > "Shirts").
    // No taxonomy UI in this slice — just leaves room for it later without
    // a migration.
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_store_slug_idx").on(table.storeId, table.slug),
    index("categories_store_id_idx").on(table.storeId),
    index("categories_parent_id_idx").on(table.parentId),
  ]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
