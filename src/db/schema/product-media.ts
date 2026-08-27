import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products } from "./products";
import { mediaKindEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// One row per uploaded photo OR video for a product. Product-level only
// (no per-variant media yet). The bytes live in the storage adapter (local
// disk now, R2 later — src/lib/storage); this table holds the key + a bit
// of metadata.
//
// Uploads are optimized before landing here: images are re-encoded to WebP
// (sharp), videos are remuxed for web streaming (ffmpeg -c copy
// +faststart). Real video re-encoding is a Phase 3 job-queue concern.
//
// sortOrder is a SINGLE ordering shared by images and videos — the lowest
// is the primary/gallery-first item. Combined caps (7 media total, at most
// 2 videos) are enforced in src/lib/products/media.ts, not the schema.
export const productMedia = pgTable(
  "product_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: mediaKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    altText: text("alt_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_media_store_id_idx").on(table.storeId),
    index("product_media_product_idx").on(table.storeId, table.productId, table.sortOrder),
  ]
);

export type ProductMedia = typeof productMedia.$inferSelect;
export type NewProductMedia = typeof productMedia.$inferInsert;
