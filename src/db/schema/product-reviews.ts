import { pgTable, uuid, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { stores } from "./stores";
import { products } from "./products";
import { reviewStatusEnum } from "./enums";

// A customer review for a product. Submitted from the storefront PDP by
// anyone (guest — name + 1..5 rating + optional text), rate-limited and
// honeypot-guarded, and always created `pending`: a merchant approves or
// rejects it in Admin -> Product Reviews. Only `approved` rows are ever
// read by the storefront (list + rating aggregate). `rating` is bounded
// 1..5 in src/lib/reviews, not by a DB constraint (same style as
// form_fields / stores.subscription_plan). Tenant-scoped, ordinary RLS
// table; also cascades when its product is deleted.
export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body"),
    status: reviewStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_reviews_store_id_idx").on(table.storeId),
    index("product_reviews_store_product_status_idx").on(
      table.storeId,
      table.productId,
      table.status
    ),
  ]
);

export type ProductReview = typeof productReviews.$inferSelect;
export type NewProductReview = typeof productReviews.$inferInsert;
