import { and, asc, eq, ne } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { redirects, type Redirect } from "@/db/schema";
import { canonicalTarget, isRedirectStatusCode, normalizePath } from "./normalize";

export type RedirectResult = { ok: true; id: string } | { error: string };

type RedirectInput = {
  fromPath: string;
  toTarget: string;
  statusCode: number;
  active: boolean;
};

function clean(input: RedirectInput):
  | { from: string; to: string; statusCode: number; active: boolean }
  | { error: string } {
  const from = normalizePath(input.fromPath);
  if (!from || from === "/") return { error: "admin.redirects.errFrom" };
  const to = canonicalTarget(input.toTarget);
  if (!to) return { error: "admin.redirects.errTo" };
  if (to === from) return { error: "admin.redirects.errLoop" };
  const statusCode = isRedirectStatusCode(input.statusCode) ? input.statusCode : 301;
  return { from, to, statusCode, active: Boolean(input.active) };
}

export async function listRedirects(storeId: string): Promise<Redirect[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(redirects)
      .where(eq(redirects.storeId, storeId))
      .orderBy(asc(redirects.fromPath))
  );
}

export async function createRedirect(
  storeId: string,
  input: RedirectInput
): Promise<RedirectResult> {
  const c = clean(input);
  if ("error" in c) return c;

  return withStoreContext(storeId, async (tx) => {
    const [dupe] = await tx
      .select({ id: redirects.id })
      .from(redirects)
      .where(and(eq(redirects.storeId, storeId), eq(redirects.fromPath, c.from)))
      .limit(1);
    if (dupe) return { error: "admin.redirects.errDuplicate" };

    const [row] = await tx
      .insert(redirects)
      .values({
        storeId,
        fromPath: c.from,
        toTarget: c.to,
        statusCode: c.statusCode,
        active: c.active,
      })
      .returning({ id: redirects.id });
    return { ok: true, id: row.id };
  });
}

export async function updateRedirect(
  storeId: string,
  redirectId: string,
  input: RedirectInput
): Promise<RedirectResult> {
  const c = clean(input);
  if ("error" in c) return c;

  return withStoreContext(storeId, async (tx) => {
    const [clash] = await tx
      .select({ id: redirects.id })
      .from(redirects)
      .where(
        and(
          eq(redirects.storeId, storeId),
          eq(redirects.fromPath, c.from),
          ne(redirects.id, redirectId)
        )
      )
      .limit(1);
    if (clash) return { error: "admin.redirects.errDuplicate" };

    await tx
      .update(redirects)
      .set({
        fromPath: c.from,
        toTarget: c.to,
        statusCode: c.statusCode,
        active: c.active,
        updatedAt: new Date(),
      })
      .where(and(eq(redirects.storeId, storeId), eq(redirects.id, redirectId)));
    return { ok: true, id: redirectId };
  });
}

export async function deleteRedirect(storeId: string, redirectId: string): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx.delete(redirects).where(and(eq(redirects.storeId, storeId), eq(redirects.id, redirectId)))
  );
}
