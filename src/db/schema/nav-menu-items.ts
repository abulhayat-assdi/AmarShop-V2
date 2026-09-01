import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { navMenus } from "./nav-menus";
import { contentEntries } from "./content-entries";
import { categories } from "./categories";
import { navMenuItemKindEnum } from "./enums";

// One link in a nav_menus row. `label` is always merchant-typed (even for
// page/category items — a menu label doesn't have to match the page
// title/category name). `url` is only meaningful for kind="custom_link";
// `contentEntryId`/`categoryId` are only meaningful for their matching
// kind — the storefront query (src/lib/menus/query.ts) resolves the real
// href from whichever one applies, joining the live slug so a rename
// never leaves a dead link. `displayOrder` is a plain typed integer, not
// drag-and-drop (see the plan's note: no sortable-list precedent exists
// anywhere in this codebase — content_entries.footerOrder is the only
// other example, same convention). Tenant-scoped, ordinary RLS table.
export const navMenuItems = pgTable(
  "nav_menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => navMenus.id, { onDelete: "cascade" }),
    kind: navMenuItemKindEnum("kind").notNull(),
    label: text("label").notNull(),
    url: text("url"),
    contentEntryId: uuid("content_entry_id").references(() => contentEntries.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
    visible: boolean("visible").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("nav_menu_items_store_id_idx").on(table.storeId),
    index("nav_menu_items_menu_id_idx").on(table.menuId),
  ]
);

export type NavMenuItem = typeof navMenuItems.$inferSelect;
export type NewNavMenuItem = typeof navMenuItems.$inferInsert;
