import { pgTable, uuid, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { forms } from "./forms";
import { formFieldTypeEnum } from "./enums";

// One input on a forms row. `options` is a newline-separated choice list,
// only meaningful for type dropdown/radio/checkbox (see
// FIELD_TYPES_WITH_OPTIONS in src/lib/forms/types.ts); null/ignored for
// the rest. `displayOrder` is a plain typed integer, not drag-and-drop
// (same convention as nav_menu_items / checkout_custom_fields — no
// sortable-list precedent in this codebase). Tenant-scoped, ordinary RLS
// table; also cascades when its parent form is deleted.
export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    type: formFieldTypeEnum("type").notNull(),
    label: text("label").notNull(),
    placeholder: text("placeholder"),
    required: boolean("required").notNull().default(false),
    options: text("options"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("form_fields_store_id_idx").on(table.storeId),
    index("form_fields_form_id_idx").on(table.formId),
  ]
);

export type FormField = typeof formFields.$inferSelect;
export type NewFormField = typeof formFields.$inferInsert;
