"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import { uninstallApp } from "@/lib/oauth/install";

export async function uninstallAppAction(installationId: string) {
  const session = await requirePermission("installed_apps:manage");
  await uninstallApp(session.user.storeId, installationId);
  revalidatePath("/installed-apps");
}
