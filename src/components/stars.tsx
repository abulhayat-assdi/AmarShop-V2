import { RATING_MAX } from "@/lib/reviews/types";

// Pure presentational star row — safe in both Server and Client
// components (no "use client", no hooks). `value` is rounded to the
// nearest whole star.
export function Stars({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(RATING_MAX, Math.round(value)));
  return (
    <span
      className={`inline-flex leading-none text-amber-500 ${className}`}
      role="img"
      aria-label={`${value.toFixed(1)} / ${RATING_MAX}`}
    >
      {Array.from({ length: RATING_MAX }, (_, i) => (
        <span key={i} aria-hidden="true">
          {i < filled ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}
