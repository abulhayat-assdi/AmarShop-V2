import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";
import { invoiceStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// This is the merchant-facing billing document (a customer's receipt for
// what they bought from a merchant) — CLAUDE.md rule #3: never to be
// confused with or merged into Store.subscription / PlatformInvoice (the
// merchant-paying-the-platform system, Phase 5).
//
// One invoice per order (orderId is unique). The PDF is NOT built here — a
// "pending" row is created inside the order transaction, and the bytes are
// rendered lazily on first download, then stored via the storage adapter
// and served from storage thereafter (see src/lib/invoices/service.ts).
//
// `number` is a per-store sequential counter (unique per store) rendered as
// "INV-000123" for humans — allocated as max(number)+1 within the order
// transaction, with the (storeId, number) unique index as the backstop.
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    status: invoiceStatusEnum("status").notNull().default("pending"),
    storageKey: text("storage_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
  },
  (table) => [
    index("invoices_store_id_idx").on(table.storeId),
    uniqueIndex("invoices_order_id_idx").on(table.orderId),
    uniqueIndex("invoices_store_number_idx").on(table.storeId, table.number),
  ]
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
