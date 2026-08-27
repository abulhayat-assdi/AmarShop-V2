import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { cartStatusEnum } from "./enums";

// Tenant-scoped: every row belongs to exactly one store. RLS policy for
// this table is defined in its migration file — see src/db/migrations.
//
// Identified by an anonymous cartToken (httpOnly cookie, src/lib/cart.ts),
// not a customer id — checkout is guest-only, so there's no logged-in
// identity to key a cart off. status defaults to "active" and nothing sets
// it to "converted"/"abandoned" yet — that's checkout (converted) and
// Phase 2's abandoned-cart recovery (abandoned), included now so neither
// needs a migration later.
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    cartToken: text("cart_token").notNull(),
    status: cartStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("carts_store_token_idx").on(table.storeId, table.cartToken),
    index("carts_store_id_idx").on(table.storeId),
  ]
);

export type Cart = typeof carts.$inferSelect;
export type NewCart = typeof carts.$inferInsert;
