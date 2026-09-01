import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { noticeSeverityEnum } from "./enums";

// A real, live shop notification — the admin bell's second data source
// alongside getStockAlerts() (src/lib/products/stock.ts). Never a
// hardcoded/fake list (SITE_STRUCTURE.md's own warning: the bell and the
// /notices page must read the same real source, or they'll contradict each
// other the moment a merchant compares the two).
//
// `category` is validated against src/lib/notices/categories.ts and is NOT
// rendered directly — the admin UI looks up admin.notices.<category> and
// interpolates `metadata`, so a notice created while the store was in one
// locale still renders correctly if the admin later switches locale.
// Tenant-scoped, ordinary RLS table (writes go through withStoreContext,
// same as webhook_endpoints/webhook_deliveries).
export const notices = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    severity: noticeSeverityEnum("severity").notNull().default("info"),
    metadata: jsonb("metadata"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notices_store_id_created_at_idx").on(table.storeId, table.createdAt)]
);

export type Notice = typeof notices.$inferSelect;
export type NewNotice = typeof notices.$inferInsert;
