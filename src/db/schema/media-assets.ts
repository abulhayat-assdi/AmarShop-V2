import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { mediaFolders } from "./media-folders";
import { mediaAssetKindEnum } from "./enums";

// Admin -> Media Library. One row per uploaded file — an image
// (re-encoded to WebP by src/lib/images/optimize.ts on upload) or a PDF
// document (stored as-is, validated on magic bytes). The bytes live in
// the storage adapter (src/lib/storage) at media/<storeId>/<uuid>.<ext>;
// this table keeps the key + display metadata.
//
// `fileName` is the merchant's original upload name, shown in the grid
// and used for the download filename — never the storage key.
// `folderId` is nullable: an asset can sit at the library root, and it
// falls back to null (not deleted) when its folder is removed.
// Tenant-scoped, ordinary RLS table.
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => mediaFolders.id, { onDelete: "set null" }),
    kind: mediaAssetKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_assets_store_id_idx").on(table.storeId),
    index("media_assets_store_folder_idx").on(table.storeId, table.folderId),
  ]
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
