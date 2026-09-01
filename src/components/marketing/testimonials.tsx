import type { Testimonial } from "@/db/schema";

// Renders published testimonial cards on the marketing site — the full
// /testimonials page and the homepage preview both use this. Quotes are
// shown verbatim (never translated) and the component never states a count
// (CLAUDE.md rule #8) — the caller decides whether to render it at all.
export function TestimonialGrid({ items }: { items: Testimonial[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((tm) => (
        <figure key={tm.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-6">
          {tm.outcome && (
            <span className="w-fit rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
              {tm.outcome}
            </span>
          )}
          <blockquote className="text-sm leading-relaxed text-gray-700">
            &ldquo;{tm.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-auto text-sm">
            <span className="font-medium">{tm.authorName}</span>
            {tm.authorRole && <span className="text-gray-500"> — {tm.authorRole}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
