"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/roles";
import { markPlatformInvoicePaid, voidPlatformInvoice } from "@/lib/billing/subscription";

// Platform-admin verification of a merchant's reported subscription
// payment. Cross-tenant by design — these are NOT storeId-scoped.

export async function markPaidAction(invoiceId: string) {
  const session = await requirePlatformAdmin();
  await markPlatformInvoicePaid(invoiceId, session.user.id ?? null);
  revalidatePath("/platform/billing");
}

export async function rejectAction(invoiceId: string) {
  await requirePlatformAdmin();
  await voidPlatformInvoice(invoiceId);
  revalidatePath("/platform/billing");
}
