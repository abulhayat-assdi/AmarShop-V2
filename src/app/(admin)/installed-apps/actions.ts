"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { uninstallApp } from "@/lib/oauth/install";

export async function uninstallAppAction(installationId: string) {
  const session = await requireRole("admin");
  await uninstallApp(session.user.storeId, installationId);
  revalidatePath("/installed-apps");
}
