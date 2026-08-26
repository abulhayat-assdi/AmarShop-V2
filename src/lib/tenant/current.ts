import { cache } from "react";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stores, type Store } from "@/db/schema";
import { STORE_ID_HEADER } from "./constants";

// The one place Server Components / Server Actions / Route Handlers read
// "which store is this request for" — never re-derive it from the Host
// header directly (proxy.ts already did that and rejected anything that
// didn't resolve). react's cache() means this only runs once per request
// even though multiple components down the tree call it.
export const getCurrentStore = cache(async (): Promise<Store | null> => {
  const headerList = await headers();
  const storeId = headerList.get(STORE_ID_HEADER);
  if (!storeId) return null;

  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  return store ?? null;
});
