import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { ProductCard } from "@/components/storefront-chrome";
import { searchProducts, parseSort } from "@/lib/products/search";
import { getTranslator } from "@/lib/i18n/server";
import { SearchBox } from "../SearchBox";
import { SortSelect } from "./SortSelect";

const PAGE_SIZE = 24;
const MAX_SHOW = 240;

function decode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function SearchResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ query: string }>;
  searchParams: Promise<{ sort?: string; show?: string }>;
}) {
  const store = await getCurrentStore();
  if (!store) notFound();

  const { query: rawQuery } = await params;
  const { sort: rawSort, show: rawShow } = await searchParams;

  const q = decode(rawQuery).trim();
  const encodedQuery = encodeURIComponent(q);
  const sort = parseSort(rawSort);

  const parsedShow = Number(rawShow);
  const show =
    Number.isInteger(parsedShow) && parsedShow > 0
      ? Math.min(parsedShow, MAX_SHOW)
      : PAGE_SIZE;

  const { items, total } = await searchProducts(store.id, { query: q, sort, limit: show });
  const { t } = await getTranslator(store.locale);

  return (
    <div className="flex flex-col gap-6">
      <SearchBox defaultValue={q} />

      {total === 0 ? (
        <div className="flex flex-col gap-2 text-gray-600">
          <p>{t("search.noResults", { query: q })}</p>
          <Link href="/search" className="text-sm underline">
            {t("search.backToSearch")}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              {t(total === 1 ? "search.showingOne" : "search.showing", {
                shown: items.length,
                total,
                query: q,
              })}
            </p>
            <SortSelect encodedQuery={encodedQuery} sort={sort} />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>

          {items.length < total && (
            <Link
              href={`/search/${encodedQuery}?sort=${sort}&show=${show + PAGE_SIZE}`}
              scroll={false}
              className="self-center rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              {t("search.loadMore")}
            </Link>
          )}
        </>
      )}
    </div>
  );
}
