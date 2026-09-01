import { pgTable, uuid, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { bdDivisions } from "./bd-divisions";

// The 64 districts under the 8 divisions above — same "genuinely
// platform-wide, no store_id" reference-data pattern, seeded once by the
// same migration. Upazila-level data (~495 rows) is deliberately not
// included yet — CLAUDE.md's backlog note: wait for a verified official
// source rather than hand-typing it from memory.
export const bdDistricts = pgTable(
  "bd_districts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => bdDivisions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameBn: text("name_bn").notNull(),
  },
  (table) => [
    index("bd_districts_division_id_idx").on(table.divisionId),
    uniqueIndex("bd_districts_name_idx").on(table.name),
  ]
);

export type BdDistrict = typeof bdDistricts.$inferSelect;
