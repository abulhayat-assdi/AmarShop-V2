import { and, desc, eq, isNull, notLike, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { notices, type Notice } from "@/db/schema";

// Unread notices for the admin bell — the dashboard/bell's counterpart to
// getStockAlerts() (src/lib/products/stock.ts). `notices` capped at `limit`
// for the dropdown; `total` is the full unread count so the UI can show
// "+N more", same convention as stock alerts. `hideBilling` respects the
// viewing staff member's own Notifications preference
// (staff_members.notify_billing_notices) — a per-viewer filter, not a
// per-store one; the notice rows themselves are unaffected.
export async function getUnreadNotices(
  storeId: string,
  opts: { limit?: number; hideBilling?: boolean } = {}
): Promise<{ notices: Notice[]; total: number }> {
  const limit = opts.limit ?? 20;
  return withStoreContext(storeId, async (tx) => {
    const where = and(
      eq(notices.storeId, storeId),
      isNull(notices.readAt),
      opts.hideBilling ? notLike(notices.category, "billing_%") : undefined
    );

    const rows = await tx
      .select()
      .from(notices)
      .where(where)
      .orderBy(desc(notices.createdAt))
      .limit(limit);

    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(notices)
      .where(where);

    return { notices: rows, total };
  });
}

// The full history for the /notices page (read and unread alike).
export async function listNotices(storeId: string, limit = 100): Promise<Notice[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select()
      .from(notices)
      .where(eq(notices.storeId, storeId))
      .orderBy(desc(notices.createdAt))
      .limit(limit)
  );
}
