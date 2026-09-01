import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { redirects } from "@/db/schema";
import { normalizePath } from "./normalize";

export type RedirectHit = { target: string; statusCode: number };

// Consulted by proxy.ts for every resolved-store GET/HEAD. One indexed
// point lookup (store_id, from_path) inside a short withStoreContext
// transaction — cheap, but it does run per request; if that ever shows up
// on the 2-vCPU box, cache the per-store redirect map in Redis and
// invalidate it from src/lib/redirects/manage.ts. Returns null for the
// overwhelmingly common "no redirect configured" case.
export async function findRedirect(
  storeId: string,
  pathname: string
): Promise<RedirectHit | null> {
  const from = normalizePath(pathname);
  if (!from) return null;

  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .select({ toTarget: redirects.toTarget, statusCode: redirects.statusCode })
      .from(redirects)
      .where(
        and(
          eq(redirects.storeId, storeId),
          eq(redirects.fromPath, from),
          eq(redirects.active, true)
        )
      )
      .limit(1)
  );
  if (!row) return null;

  // A row whose target normalises back to its own source would loop —
  // guarded on write too, belt and braces here.
  if (row.toTarget === from) return null;

  return { target: row.toTarget, statusCode: row.statusCode };
}
