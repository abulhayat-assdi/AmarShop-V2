"use client";

import { useRouter } from "next/navigation";
import { useTranslator } from "@/components/i18n-provider";
import { SEARCH_SORTS, type SearchSort } from "@/lib/products/search-constants";

const SORT_KEY: Record<SearchSort, string> = {
  relevance: "search.sortRelevance",
  price_asc: "search.sortPriceAsc",
  price_desc: "search.sortPriceDesc",
  newest: "search.sortNewest",
};

// Changing the sort resets to the first page (drops ?show=).
export function SortSelect({
  encodedQuery,
  sort,
}: {
  encodedQuery: string;
  sort: SearchSort;
}) {
  const router = useRouter();
  const t = useTranslator();

  return (
    <label className="flex items-center gap-2 text-sm">
      {t("search.sort")}
      <select
        value={sort}
        onChange={(e) => router.push(`/search/${encodedQuery}?sort=${e.target.value}`)}
        className="rounded border border-gray-300 px-2 py-1"
      >
        {SEARCH_SORTS.map((value) => (
          <option key={value} value={value}>
            {t(SORT_KEY[value])}
          </option>
        ))}
      </select>
    </label>
  );
}
