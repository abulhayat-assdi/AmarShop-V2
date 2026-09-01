"use client";

import { useState, useTransition } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { Stars } from "@/components/stars";
import type { AdminReviewRow } from "@/lib/reviews/query";
import { approveReviewAction, deleteReviewAction, rejectReviewAction } from "./actions";

const STATUS_KEY: Record<AdminReviewRow["status"], string> = {
  pending: "admin.reviews.statusPending",
  approved: "admin.reviews.statusApproved",
  rejected: "admin.reviews.statusRejected",
};
const STATUS_CLASS: Record<AdminReviewRow["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-gray-100 text-gray-600",
};

export function ReviewRow({ review }: { review: AdminReviewRow }) {
  const t = useTranslator();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} className="text-sm" />
        <span className="font-medium">{review.authorName}</span>
        <span className="text-gray-400">·</span>
        <a href={`/product/${review.productSlug}`} target="_blank" rel="noreferrer" className="underline">
          {review.productName}
        </a>
        <span
          className={`ml-auto rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[review.status]}`}
        >
          {t(STATUS_KEY[review.status])}
        </span>
      </div>

      {review.body && <p className="whitespace-pre-wrap text-gray-700">{review.body}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {review.status !== "approved" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => approveReviewAction(review.id))}
            className="text-green-700 underline disabled:opacity-50"
          >
            {t("admin.reviews.approve")}
          </button>
        )}
        {review.status !== "rejected" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => rejectReviewAction(review.id))}
            className="text-amber-700 underline disabled:opacity-50"
          >
            {t("admin.reviews.reject")}
          </button>
        )}
        {confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-gray-600">{t("admin.reviews.deleteQ")}</span>
            <button
              type="button"
              onClick={() => startTransition(() => deleteReviewAction(review.id))}
              className="text-red-600 underline"
            >
              {t("admin.common.delete")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="underline">
              {t("admin.common.cancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-red-600 underline"
          >
            {t("admin.common.delete")}
          </button>
        )}
      </div>
    </li>
  );
}
