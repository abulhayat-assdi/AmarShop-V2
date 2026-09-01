import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

// Merchant testimonials shown on the PUBLIC MARKETING SITE
// (SITE_STRUCTURE.md Part A) — quotes from real merchants about AmarShop,
// authored by a platform admin at /platform/testimonials. This is
// platform-owned marketing content, not tenant data: no `store_id`, and
// DELIBERATELY OUTSIDE the app.current_store_id RLS boundary, the same
// call `stores` / `platform_invoices` make (see
// src/db/schema/platform-invoices.ts). Writes are gated in the app layer
// by requirePlatformAdmin(); the marketing site reads only `published`
// rows via an explicit `where published = true`. That is not a rule #2
// gap — the table has no tenant dimension to isolate.
//
// A quote is shown verbatim in whatever language it was given (real quotes
// aren't translated), so there is no per-locale column — CLAUDE.md rule #8:
// the /testimonials page and the homepage preview never state a count,
// they just render the cards that exist, and the homepage section is
// absent entirely when nothing is published.
export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorName: text("author_name").notNull(),
    // e.g. "Owner, Rangeen" — free text, optional.
    authorRole: text("author_role"),
    quote: text("quote").notNull(),
    // The one-line outcome badge, e.g. "Launched in 1 day" — optional.
    outcome: text("outcome"),
    displayOrder: integer("display_order").notNull().default(0),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("testimonials_published_order_idx").on(table.published, table.displayOrder)]
);

export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;
