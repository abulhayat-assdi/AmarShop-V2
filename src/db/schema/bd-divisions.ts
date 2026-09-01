import { pgTable, uuid, text, integer, uniqueIndex } from "drizzle-orm/pg-core";

// Bangladesh's 8 administrative divisions — genuinely platform-wide
// reference data, not tenant-scoped. Unlike every other table in this
// schema (which either belongs to a store, or — like `stores` /
// `platform_invoices` / `api_keys` — still carries a store_id and just
// sits outside the RLS boundary), this table has no store_id at all: it's
// the same 8 rows for every tenant. Seeded once by this table's own
// migration (0035_add_locations.sql), never written to by the app —
// Admin -> Locations (src/app/(admin)/locations) is read-only.
// SITE_STRUCTURE.md: "seed this once, platform-wide, not per-tenant."
export const bdDivisions = pgTable(
  "bd_divisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    nameBn: text("name_bn").notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [uniqueIndex("bd_divisions_name_idx").on(table.name)]
);

export type BdDivision = typeof bdDivisions.$inferSelect;
