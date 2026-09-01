import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { productReviews, products } from "@/db/schema";
import {
  isValidRating,
  REVIEW_AUTHOR_MAX,
  REVIEW_BODY_MAX,
  type ReviewStatus,
} from "./types";

export type SubmitReviewResult = { ok: true } | { error: string };

// Storefront submit (guest). Validates, confirms the product exists and
// is active for this store, inserts a `pending` row. i18n keys, not raw
// strings.
export async function submitReview(
  storeId: string,
  input: { productId: string; authorName: string; rating: number; body: string }
): Promise<SubmitReviewResult> {
  const authorName = input.authorName.trim();
  const body = input.body.trim();

  if (!authorName) return { error: "reviews.errName" };
  if (authorName.length > REVIEW_AUTHOR_MAX) return { error: "reviews.errName" };
  if (!isValidRating(input.rating)) return { error: "reviews.errRating" };
  if (body.length > REVIEW_BODY_MAX) return { error: "reviews.errBodyLong" };

  return withStoreContext(storeId, async (tx) => {
    const [product] = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.id, input.productId),
          eq(products.status, "active")
        )
      )
      .limit(1);
    if (!product) return { error: "reviews.errProduct" };

    await tx.insert(productReviews).values({
      storeId,
      productId: input.productId,
      rating: input.rating,
      authorName,
      body: body || null,
    });
    return { ok: true };
  });
}

export async function setReviewStatus(
  storeId: string,
  reviewId: string,
  status: ReviewStatus
): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .update(productReviews)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(productReviews.storeId, storeId), eq(productReviews.id, reviewId)))
  );
}

export async function deleteReview(storeId: string, reviewId: string): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .delete(productReviews)
      .where(and(eq(productReviews.storeId, storeId), eq(productReviews.id, reviewId)))
  );
}
