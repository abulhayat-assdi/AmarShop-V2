import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { formStatusEnum } from "./enums";

// Admin -> Forms. A merchant-built custom form (contact form, pre-order
// enquiry, feedback, …) rendered on the storefront at /form/<slug>. Its
// fields live in form_fields; submissions land in form_submissions.
// `slug` is unique per store (the storefront route keys off it).
// `successMessage` is shown after a submit — a null falls back to an
// i18n default. Tenant-scoped, ordinary RLS table.
export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    successMessage: text("success_message"),
    status: formStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("forms_store_id_idx").on(table.storeId),
    uniqueIndex("forms_store_id_slug_idx").on(table.storeId, table.slug),
  ]
);

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
