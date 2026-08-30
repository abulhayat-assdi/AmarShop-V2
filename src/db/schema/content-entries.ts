import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { contentKindEnum, contentStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// One table for both blog posts (`kind = 'post'`) and static storefront
// pages (`kind = 'page'`) — the same underlying thing: a slug'd markdown
// document with a draft/published state. `body_markdown` holds the raw
// source; it's rendered + sanitised at read time (src/lib/cms/render.ts).
// `published_at` is stamped once, the first time a row goes published, and
// drives blog ordering + the displayed date. `show_in_footer` /
// `footer_order` only apply to pages.
export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    kind: contentKindEnum("kind").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    bodyMarkdown: text("body_markdown").notNull().default(""),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    showInFooter: boolean("show_in_footer").notNull().default(false),
    footerOrder: integer("footer_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("content_entries_store_kind_slug_idx").on(table.storeId, table.kind, table.slug),
    index("content_entries_store_id_idx").on(table.storeId),
    index("content_entries_store_kind_status_idx").on(table.storeId, table.kind, table.status),
  ]
);

export type ContentEntry = typeof contentEntries.$inferSelect;
export type NewContentEntry = typeof contentEntries.$inferInsert;
