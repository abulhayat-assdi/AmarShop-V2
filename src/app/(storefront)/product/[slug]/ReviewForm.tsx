"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { RATING_MAX, REVIEW_AUTHOR_MAX, REVIEW_BODY_MAX } from "@/lib/reviews/types";
import { submitReviewAction, type SubmitReviewState } from "./actions";

const initialState: SubmitReviewState = {};

export function ReviewForm({ productId }: { productId: string }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(submitReviewAction, initialState);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state.ok) {
    return (
      <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-800">
        {t("reviews.submitted")}
      </p>
    );
  }

  const field = "w-full rounded border border-gray-300 px-3 py-2 text-sm";
  const shown = hover || rating;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input
        type="text"
        name="_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("reviews.ratingLabel")}</span>
        <div className="flex gap-1 text-2xl leading-none text-amber-500" role="radiogroup">
          {Array.from({ length: RATING_MAX }, (_, i) => {
            const v = i + 1;
            return (
              <label key={v} className="cursor-pointer" aria-label={`${v}`}>
                <input
                  type="radio"
                  name="rating"
                  value={v}
                  checked={rating === v}
                  onChange={() => setRating(v)}
                  className="sr-only"
                  required
                />
                <span
                  onMouseEnter={() => setHover(v)}
                  onMouseLeave={() => setHover(0)}
                >
                  {v <= shown ? "★" : "☆"}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {t("reviews.nameLabel")}
        <input name="authorName" required maxLength={REVIEW_AUTHOR_MAX} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("reviews.bodyLabel")}
        <textarea name="body" rows={3} maxLength={REVIEW_BODY_MAX} className={field} />
      </label>

      {state.error && (
        <p className="text-sm text-red-700">{t(state.error.key, state.error.vars)}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-5 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("reviews.submitting") : t("reviews.submit")}
      </button>
    </form>
  );
}
