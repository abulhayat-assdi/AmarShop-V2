"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import { deleteReview, setReviewStatus } from "@/lib/reviews/mutate";

// Review moderation is user-generated content management — reuses the
// Content group's `content:manage` permission (like Blog / Media / Forms).
function revalidateAll() {
  revalidatePath("/reviews");
  // storefront rating aggregate + PDP list
  revalidatePath("/", "layout");
}

export async function approveReviewAction(reviewId: string): Promise<void> {
  const session = await requirePermission("content:manage");
  await setReviewStatus(session.user.storeId, reviewId, "approved");
  revalidateAll();
}

export async function rejectReviewAction(reviewId: string): Promise<void> {
  const session = await requirePermission("content:manage");
  await setReviewStatus(session.user.storeId, reviewId, "rejected");
  revalidateAll();
}

export async function deleteReviewAction(reviewId: string): Promise<void> {
  const session = await requirePermission("content:manage");
  await deleteReview(session.user.storeId, reviewId);
  revalidateAll();
}
