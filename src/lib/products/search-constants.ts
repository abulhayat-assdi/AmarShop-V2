// Client-safe: no server-only imports, so a "use client" component (the
// sort dropdown) can pull these in without dragging fs/sharp/drizzle into
// the browser bundle. The search query itself lives in ./search.ts.

export const SEARCH_SORTS = ["relevance", "price_asc", "price_desc", "newest"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export function parseSort(raw: string | undefined): SearchSort {
  return (SEARCH_SORTS as readonly string[]).includes(raw ?? "")
    ? (raw as SearchSort)
    : "relevance";
}
