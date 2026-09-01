import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";

// Admin -> URL Redirects. Per-store storefront redirects, consulted by
// proxy.ts on every resolved-store GET/HEAD (after host resolution,
// before the route runs). `fromPath` is an exact, normalised pathname
// (leading slash, no trailing slash, no query) — one row per (store,
// fromPath). `toTarget` is either a site-relative path (`/new`) or an
// absolute `https://…` URL. `statusCode` is 301 or 302 (validated in
// src/lib/redirects, not a DB constraint — same style as
// stores.subscription_plan). Tenant-scoped, ordinary RLS table; the
// proxy lookup goes through withStoreContext like every other tenant
// read (a Redis-cached redirect map is the optimisation if the extra
// per-request lookup ever matters — see src/lib/redirects/lookup.ts).
export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    fromPath: text("from_path").notNull(),
    toTarget: text("to_target").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("redirects_store_id_idx").on(table.storeId),
    uniqueIndex("redirects_store_id_from_path_idx").on(table.storeId, table.fromPath),
  ]
);

export type Redirect = typeof redirects.$inferSelect;
export type NewRedirect = typeof redirects.$inferInsert;
