import type { TenantTx } from "@/db/context";
import { notices } from "@/db/schema";
import { NOTICE_SEVERITY_BY_CATEGORY, type NoticeCategory } from "./categories";

// Insert one notice row inside the caller's own tenant transaction. Unlike
// emitWebhook()/sendOrderSms() this is a plain DB write, not an external
// call, so it doesn't need its own retry/never-throws wrapper — the caller
// decides whether a failure here should roll back its own transaction.
export async function createNotice(
  tx: TenantTx,
  storeId: string,
  category: NoticeCategory,
  metadata?: Record<string, unknown>
): Promise<void> {
  await tx.insert(notices).values({
    storeId,
    category,
    severity: NOTICE_SEVERITY_BY_CATEGORY[category],
    metadata: metadata ?? null,
  });
}
