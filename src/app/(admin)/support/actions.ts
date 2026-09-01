"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { BD_PHONE_PATTERN } from "@/lib/phone";

export type SupportState = { error?: string; ok?: boolean };

// Basic RFC-5322-ish check — good enough to catch typos, not a full
// validator. Matches the leniency of other optional-field validation in
// this codebase (see normalizeMetaPixelId/normalizeGa4Id).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// stores is outside the RLS boundary — write via `db` directly, scoped by
// the session's own storeId, like marketing-settings/actions.ts.
export async function saveSupportSettingsAction(
  _prev: SupportState,
  formData: FormData
): Promise<SupportState> {
  const session = await requirePermission("support:manage");

  const emailRaw = String(formData.get("supportEmail") ?? "").trim();
  const phoneRaw = String(formData.get("supportPhone") ?? "").trim();
  const hoursRaw = String(formData.get("supportHours") ?? "").trim();

  if (emailRaw !== "" && !EMAIL_PATTERN.test(emailRaw)) {
    return { error: "admin.support.errEmail" };
  }
  if (phoneRaw !== "" && !BD_PHONE_PATTERN.test(phoneRaw)) {
    return { error: "admin.support.errPhone" };
  }

  await db
    .update(stores)
    .set({
      supportEmail: emailRaw === "" ? null : emailRaw,
      supportPhone: phoneRaw === "" ? null : phoneRaw,
      supportHours: hoursRaw === "" ? null : hoursRaw,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/support");
  return { ok: true };
}
