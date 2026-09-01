import { sql } from "drizzle-orm";
import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// Admin -> Menu Builder. A store can have more than one named menu, but
// only one is ever rendered — the header nav — so the admin UI (Menu
// Builder) doesn't surface menu management as its own step: it
// get-or-creates one menu per store lazily and only exposes item
// management. `isActive` exists in the schema (matching
// SITE_STRUCTURE.md's "Menu name/status") for a later multi-menu slot
// (e.g. a footer menu) without a migration, but today exactly zero or one
// row per store is ever active. Tenant-scoped, ordinary RLS table.
export const navMenus = pgTable(
  "nav_menus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("nav_menus_store_id_idx").on(table.storeId),
    // At most one active menu per store — getOrCreateMenuId() (src/lib/
    // menus/query.ts) relies on this being true for its own `.limit(1)`
    // lookup to be well-defined; without it, two active rows would make
    // "the" active menu ambiguous (caught live: a second manually-created
    // active row made the header silently fall back to an empty menu
    // instead of the one with items).
    uniqueIndex("nav_menus_one_active_per_store_idx").on(table.storeId).where(sql`${table.isActive} = true`),
  ]
);

export type NavMenu = typeof navMenus.$inferSelect;
export type NewNavMenu = typeof navMenus.$inferInsert;
