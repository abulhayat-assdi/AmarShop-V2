import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __queryClient: ReturnType<typeof postgres> | undefined;
  var __db: DbInstance | undefined;
}

// Constructed lazily, on first real query, not at module-import time.
// `next build` statically evaluates every route module to collect page
// data — if this threw at import time (no real DATABASE_URL is available
// in the Docker builder stage, only inside the running container), the
// build itself would fail before the app ever runs.
function getDb(): DbInstance {
  if (globalThis.__db) return globalThis.__db;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  // Single shared connection pool for the whole app, reused across dev-mode
  // Fast Refresh reloads (otherwise every reload leaks a new pool until
  // Postgres's max_connections is exhausted). Tenant scoping is never
  // applied here — see withStoreContext() in ./context.ts, the only
  // sanctioned way to run a query against a tenant-scoped table.
  const queryClient = globalThis.__queryClient ?? postgres(process.env.DATABASE_URL, { max: 10 });
  globalThis.__queryClient = queryClient;

  const instance = drizzle(queryClient, { schema });
  globalThis.__db = instance;
  return instance;
}

export const db: DbInstance = new Proxy({} as DbInstance, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
