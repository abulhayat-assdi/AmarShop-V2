import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { productReviews, products } from "@/db/schema";
import type { RatingSummary, ReviewStatus } from "./types";

export type StorefrontReview = {
  id: string;
  authorName: string;
  rating: number;
  body: string | null;
  createdAt: Date;
};

// Approved reviews for one product, newest first — the PDP list.
export async function getApprovedReviews(
  storeId: string,
  productId: string
): Promise<StorefrontReview[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: productReviews.id,
        authorName: productReviews.authorName,
        rating: productReviews.rating,
        body: productReviews.body,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.storeId, storeId),
          eq(productReviews.productId, productId),
          eq(productReviews.status, "approved")
        )
      )
      .orderBy(desc(productReviews.createdAt))
  );
}

// { count, average } per product, from APPROVED reviews only — for the PDP
// header and product cards. Products with no approved reviews are absent
// from the map (callers render "No reviews yet").
export async function getRatingSummaries(
  storeId: string,
  productIds: string[]
): Promise<Map<string, RatingSummary>> {
  const out = new Map<string, RatingSummary>();
  if (productIds.length === 0) return out;

  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({
        productId: productReviews.productId,
        count: sql<number>`count(*)::int`,
        average: sql<number>`avg(${productReviews.rating})::float`,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.storeId, storeId),
          eq(productReviews.status, "approved"),
          inArray(productReviews.productId, productIds)
        )
      )
      .groupBy(productReviews.productId)
  );

  for (const r of rows) {
    out.set(r.productId, { count: r.count, average: r.average });
  }
  return out;
}

export type AdminReviewRow = StorefrontReview & {
  productId: string;
  productName: string;
  productSlug: string;
  status: ReviewStatus;
};

// The moderation queue. Optionally filtered by status; newest first.
export async function listReviewsForAdmin(
  storeId: string,
  status?: ReviewStatus
): Promise<AdminReviewRow[]> {
  const conditions = [eq(productReviews.storeId, storeId)];
  if (status) conditions.push(eq(productReviews.status, status));

  return withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: productReviews.id,
        authorName: productReviews.authorName,
        rating: productReviews.rating,
        body: productReviews.body,
        createdAt: productReviews.createdAt,
        status: productReviews.status,
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .where(and(...conditions))
      .orderBy(desc(productReviews.createdAt))
  );
}

export async function countReviewsByStatus(
  storeId: string
): Promise<Record<ReviewStatus, number>> {
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({ status: productReviews.status, n: sql<number>`count(*)::int` })
      .from(productReviews)
      .where(eq(productReviews.storeId, storeId))
      .groupBy(productReviews.status)
  );
  const out: Record<ReviewStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}
