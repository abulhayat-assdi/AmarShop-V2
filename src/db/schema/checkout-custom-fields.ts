import { pgTable, uuid, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { checkoutFieldTypeEnum } from "./enums";

// Admin -> Checkout Settings. A merchant-defined question shown after the
// existing `notes` textarea on checkout (SITE_STRUCTURE.md: "gift
// message, delivery instructions, preferred time, business VAT number").
// `displayOrder` is a plain typed integer, same convention as every other
// ordered list in this codebase (content_entries.footerOrder,
// nav_menu_items.displayOrder) — no drag-and-drop. Tenant-scoped,
// ordinary RLS table.
export const checkoutCustomFields = pgTable(
  "checkout_custom_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    fieldType: checkoutFieldTypeEnum("field_type").notNull().default("text"),
    required: boolean("required").notNull().default(false),
    active: boolean("active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("checkout_custom_fields_store_id_idx").on(table.storeId)]
);

export type CheckoutCustomField = typeof checkoutCustomFields.$inferSelect;
export type NewCheckoutCustomField = typeof checkoutCustomFields.$inferInsert;
