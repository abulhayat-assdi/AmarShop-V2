import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { SearchBox } from "./SearchBox";

export default async function SearchLandingPage() {
  const store = await getCurrentStore();
  if (!store) notFound();

  const categoryRows = await withStoreContext(store.id, (tx) =>
    tx.select().from(categories).where(eq(categories.storeId, store.id))
  );
  const { t } = await getTranslator(store.locale);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{t("search.title")}</h1>
        <SearchBox />
      </div>

      {categoryRows.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{t("search.shopByCategory")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categoryRows.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="rounded border p-4 text-center hover:border-gray-400"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
