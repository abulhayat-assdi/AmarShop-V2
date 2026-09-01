"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";

export type DefaultPagesState = { error?: string; ok?: boolean };

// stores is outside the RLS boundary — write via `db` directly, scoped by
// the session's own storeId, like every other stores.* settings action.
export async function updateHomeLayoutAction(
  _prev: DefaultPagesState,
  formData: FormData
): Promise<DefaultPagesState> {
  const session = await requirePermission("settings:manage");

  const homeShowCategories = formData.get("homeShowCategories") != null;
  const homeShowNewArrivals = formData.get("homeShowNewArrivals") != null;
  const categoriesOrderRaw = String(formData.get("homeCategoriesOrder") ?? "1").trim();
  const newArrivalsOrderRaw = String(formData.get("homeNewArrivalsOrder") ?? "2").trim();

  const homeCategoriesOrder = Number.isInteger(Number(categoriesOrderRaw)) ? Number(categoriesOrderRaw) : 1;
  const homeNewArrivalsOrder = Number.isInteger(Number(newArrivalsOrderRaw))
    ? Number(newArrivalsOrderRaw)
    : 2;

  await db
    .update(stores)
    .set({
      homeShowCategories,
      homeShowNewArrivals,
      homeCategoriesOrder,
      homeNewArrivalsOrder,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, session.user.storeId));

  revalidatePath("/default-pages");
  return { ok: true };
}
