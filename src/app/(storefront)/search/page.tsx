import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { SearchBox } from "./SearchBox";

export default async function SearchLandingPage() {
  const store = await getCurrentStore();
  if (!store) notFound();

  const categoryRows = await withStoreContext(store.id, (tx) =>
    tx.select().from(categories).where(eq(categories.storeId, store.id))
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Search products</h1>
        <SearchBox />
      </div>

      {categoryRows.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Shop by category</h2>
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
