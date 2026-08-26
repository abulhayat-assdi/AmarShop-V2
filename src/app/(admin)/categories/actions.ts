"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { uniqueSlug } from "@/lib/slugify";

export type CreateCategoryState = { error?: string; ok?: boolean };

export async function createCategory(
  _prevState: CreateCategoryState,
  formData: FormData
): Promise<CreateCategoryState> {
  const session = await requireStaffSession();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return { error: "Category name is required." };
  }

  await withStoreContext(session.user.storeId, async (tx) => {
    const slug = await uniqueSlug(name, async (candidate) => {
      const [existing] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.storeId, session.user.storeId), eq(categories.slug, candidate)))
        .limit(1);
      return Boolean(existing);
    });

    await tx.insert(categories).values({
      storeId: session.user.storeId,
      name,
      slug,
      description: description || null,
    });
  });

  revalidatePath("/categories");
  return { ok: true };
}
