import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentStore } from "@/lib/tenant/current";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { StorefrontHeader, StorefrontFooter } from "@/components/storefront-chrome";

// /category/* and /product/* only ever make sense on a resolved store host
// — proxy.ts already 404s an unresolved subdomain, but someone hitting
// these paths on the bare platform root still needs a defined result.
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const store = await getCurrentStore();
  if (!store) {
    notFound();
  }

  const categoryRows = await withStoreContext(store.id, (tx) =>
    tx.select().from(categories).where(eq(categories.storeId, store.id))
  );

  return (
    <>
      <StorefrontHeader store={store} categories={categoryRows} />
      <main className="mx-auto max-w-5xl p-4">{children}</main>
      <StorefrontFooter store={store} />
    </>
  );
}
