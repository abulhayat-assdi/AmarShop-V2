import { pgTable, uuid, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { forms } from "./forms";

// One completed submission of a form. `answers` is a frozen display
// snapshot — an array of { label, value } captured at submit time, so a
// later field rename/delete never corrupts an old submission (same intent
// as order_custom_field_answers' label snapshot). It's stored as jsonb
// rather than a row-per-answer table because it is display-only: never
// filtered, joined or aggregated on — the only reader is the admin
// submissions viewer. `value` is always a string (checkbox answers are
// joined with ", "). Tenant-scoped, ordinary RLS table; cascades with its
// parent form.
export type FormAnswer = { label: string; value: string };

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<FormAnswer[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("form_submissions_store_id_idx").on(table.storeId),
    index("form_submissions_form_id_created_at_idx").on(table.formId, table.createdAt),
  ]
);

export type FormSubmission = typeof formSubmissions.$inferSelect;
export type NewFormSubmission = typeof formSubmissions.$inferInsert;
