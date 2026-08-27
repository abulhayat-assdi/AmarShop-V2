"use client";

import { useRouter } from "next/navigation";
import { SEARCH_SORTS, SEARCH_SORT_LABELS, type SearchSort } from "@/lib/products/search-constants";

// Changing the sort resets to the first page (drops ?show=).
export function SortSelect({
  encodedQuery,
  sort,
}: {
  encodedQuery: string;
  sort: SearchSort;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      Sort
      <select
        value={sort}
        onChange={(e) => router.push(`/search/${encodedQuery}?sort=${e.target.value}`)}
        className="rounded border border-gray-300 px-2 py-1"
      >
        {SEARCH_SORTS.map((value) => (
          <option key={value} value={value}>
            {SEARCH_SORT_LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
