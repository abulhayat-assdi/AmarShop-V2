import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { orders } from "./orders";
import { paymentMethodEnum, paymentStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// This is the customer-paying-a-merchant billing system (CLAUDE.md rule
// #3) — never to be confused with or merged into Store.subscription /
// PlatformInvoice (the merchant-paying-the-platform system, Phase 5).
//
// A COD payment stays "pending" until staff mark it received. An
// SSLCommerz payment stays "pending" until the IPN listener + Order
// Validation API confirm it (src/lib/payments/sslcommerz-confirm.ts) —
// flipping it to "paid" or "failed".
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    // Our own transaction id (a UUID generated at checkout), passed to the
    // gateway as tran_id and echoed back on IPN / return.
    transactionId: text("transaction_id"),
    // The gateway's own reference (SSLCommerz bank_tran_id), captured on
    // confirmation for reconciliation / refunds.
    gatewayReference: text("gateway_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_store_id_idx").on(table.storeId),
    index("payments_order_id_idx").on(table.orderId),
  ]
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
