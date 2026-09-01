import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// Admin -> Media Library. A flat, single-level grouping for a store's
// uploaded files (media_assets.folder_id points here). No nesting — there
// is no tree-UI precedent anywhere in this codebase, same call as Menu
// Builder's flat item list. Deleting a folder does NOT delete its files:
// the media_assets FK is ON DELETE SET NULL, so the assets fall back to
// "no folder". Tenant-scoped, ordinary RLS table.
export const mediaFolders = pgTable(
  "media_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_folders_store_id_idx").on(table.storeId),
    // One folder name per store — the create/rename actions rely on this
    // to reject a duplicate instead of silently making an ambiguous pair.
    uniqueIndex("media_folders_store_id_name_idx").on(table.storeId, table.name),
  ]
);

export type MediaFolder = typeof mediaFolders.$inferSelect;
export type NewMediaFolder = typeof mediaFolders.$inferInsert;
