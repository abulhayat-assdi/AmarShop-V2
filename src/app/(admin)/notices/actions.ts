"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { notices } from "@/db/schema";

// Reading/dismissing notices is not a sensitive mutation (nothing about
// the store changes) — any authenticated staff member may do it, same
// level as viewing the bell itself (which every staff role already sees).
export async function markNoticeReadAction(formData: FormData): Promise<void> {
  const session = await requireStaffSession();
  const noticeId = String(formData.get("noticeId") ?? "");
  if (!noticeId) return;

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(notices)
      .set({ readAt: new Date() })
      .where(and(eq(notices.id, noticeId), eq(notices.storeId, session.user.storeId)))
  );

  revalidatePath("/notices");
}

export async function markAllNoticesReadAction(): Promise<void> {
  const session = await requireStaffSession();

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(notices)
      .set({ readAt: new Date() })
      .where(and(eq(notices.storeId, session.user.storeId), isNull(notices.readAt)))
  );

  revalidatePath("/notices");
}
