"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth/roles";
import { setLeadStatus } from "@/lib/checkout-leads";

export async function markLeadContacted(leadId: string) {
  const session = await requireStaffSession();
  await setLeadStatus(session.user.storeId, leadId, "contacted");
  revalidatePath("/abandoned-checkouts");
}

export async function dismissLead(leadId: string) {
  const session = await requireStaffSession();
  await setLeadStatus(session.user.storeId, leadId, "dismissed");
  revalidatePath("/abandoned-checkouts");
}
