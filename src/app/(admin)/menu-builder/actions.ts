"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { navMenuItems } from "@/db/schema";
import { getMenuItemsForAdmin } from "@/lib/menus/query";

export type MenuItemState = { error?: string; ok?: boolean };

const KINDS = ["custom_link", "page", "category"] as const;
type Kind = (typeof KINDS)[number];

export async function addMenuItemAction(
  _prev: MenuItemState,
  formData: FormData
): Promise<MenuItemState> {
  const session = await requirePermission("settings:manage");

  const label = String(formData.get("label") ?? "").trim();
  const rawKind = String(formData.get("kind") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const contentEntryId = String(formData.get("contentEntryId") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const displayOrderRaw = String(formData.get("displayOrder") ?? "0").trim();

  if (!label) return { error: "admin.menuBuilder.errLabel" };
  if (!(KINDS as readonly string[]).includes(rawKind)) return { error: "admin.menuBuilder.errKind" };
  const kind = rawKind as Kind;

  if (kind === "custom_link" && !/^https?:\/\/\S+$|^\/\S*$/.test(url)) {
    return { error: "admin.menuBuilder.errUrl" };
  }
  if (kind === "page" && !contentEntryId) return { error: "admin.menuBuilder.errTarget" };
  if (kind === "category" && !categoryId) return { error: "admin.menuBuilder.errTarget" };

  const displayOrder = Number.isInteger(Number(displayOrderRaw)) ? Number(displayOrderRaw) : 0;

  const { menuId } = await getMenuItemsForAdmin(session.user.storeId);
  await withStoreContext(session.user.storeId, (tx) =>
    tx.insert(navMenuItems).values({
      storeId: session.user.storeId,
      menuId,
      kind,
      label,
      url: kind === "custom_link" ? url : null,
      contentEntryId: kind === "page" ? contentEntryId : null,
      categoryId: kind === "category" ? categoryId : null,
      displayOrder,
    })
  );

  revalidatePath("/menu-builder");
  return { ok: true };
}

export async function updateMenuItemAction(
  itemId: string,
  _prev: MenuItemState,
  formData: FormData
): Promise<MenuItemState> {
  const session = await requirePermission("settings:manage");

  const label = String(formData.get("label") ?? "").trim();
  const displayOrderRaw = String(formData.get("displayOrder") ?? "0").trim();
  const visible = formData.get("visible") != null;
  const openInNewTab = formData.get("openInNewTab") != null;

  if (!label) return { error: "admin.menuBuilder.errLabel" };
  const displayOrder = Number.isInteger(Number(displayOrderRaw)) ? Number(displayOrderRaw) : 0;

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(navMenuItems)
      .set({ label, displayOrder, visible, openInNewTab, updatedAt: new Date() })
      .where(and(eq(navMenuItems.id, itemId), eq(navMenuItems.storeId, session.user.storeId)))
  );

  revalidatePath("/menu-builder");
  return { ok: true };
}

export async function deleteMenuItemAction(itemId: string): Promise<void> {
  const session = await requirePermission("settings:manage");
  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .delete(navMenuItems)
      .where(and(eq(navMenuItems.id, itemId), eq(navMenuItems.storeId, session.user.storeId)))
  );
  revalidatePath("/menu-builder");
}
