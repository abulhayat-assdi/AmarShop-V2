import { sql } from "drizzle-orm";
import { db } from "./client";

export type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The only sanctioned way to run a query against a tenant-scoped table
 * (CLAUDE.md rule #1). Runs `fn` inside a transaction with
 * `app.current_store_id` set via `set_config(..., true)` — the `true`
 * (is_local) flag scopes it to this transaction only, so it never leaks
 * across reused connections in the pool. Postgres RLS policies on every
 * tenant-scoped table key off this same setting (see src/db/migrations).
 *
 * set_config() is used instead of `SET LOCAL app.current_store_id = ...`
 * because SET does not accept bind parameters — set_config() is a normal
 * parameterized function call, so storeId is never string-interpolated
 * into SQL.
 */
export async function withStoreContext<T>(
  storeId: string,
  fn: (tx: TenantTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_store_id', ${storeId}, true)`);
    return fn(tx);
  });
}
