import { and, asc, eq } from "drizzle-orm";
import { withStoreContext, type TenantTx } from "@/db/context";
import { navMenus, navMenuItems, contentEntries, categories, type NavMenuItem } from "@/db/schema";

// Menu Builder doesn't surface "which menu" as a step — every store has
// at most one active menu (the header nav), get-or-created lazily here.
// See the schema comment on nav-menus.ts for why the table still supports
// more than one row.
async function getOrCreateMenuId(tx: TenantTx, storeId: string): Promise<string> {
  const [existing] = await tx
    .select({ id: navMenus.id })
    .from(navMenus)
    .where(and(eq(navMenus.storeId, storeId), eq(navMenus.isActive, true)))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await tx
    .insert(navMenus)
    .values({ storeId, name: "Header", isActive: true })
    .returning({ id: navMenus.id });
  return created.id;
}

export async function getMenuItemsForAdmin(storeId: string): Promise<{ menuId: string; items: NavMenuItem[] }> {
  return withStoreContext(storeId, async (tx) => {
    const menuId = await getOrCreateMenuId(tx, storeId);
    const items = await tx
      .select()
      .from(navMenuItems)
      .where(and(eq(navMenuItems.storeId, storeId), eq(navMenuItems.menuId, menuId)))
      .orderBy(asc(navMenuItems.displayOrder), asc(navMenuItems.createdAt));
    return { menuId, items };
  });
}

export type ResolvedMenuLink = { id: string; label: string; href: string; openInNewTab: boolean };

// The storefront's read: resolved, visible-only links in order. `href` is
// computed fresh from the referenced page/category's current slug — a
// rename never leaves a stale link. Returns [] (not null) when the store
// has no menu or every item is hidden — StorefrontHeader falls back to
// the plain category list in that case (see src/app/page.tsx /
// (storefront)/layout.tsx, which both already fetch `categories`
// regardless, so the fallback is free).
export async function getActiveMenuLinks(storeId: string): Promise<ResolvedMenuLink[]> {
  return withStoreContext(storeId, async (tx) => {
    const [menu] = await tx
      .select({ id: navMenus.id })
      .from(navMenus)
      .where(and(eq(navMenus.storeId, storeId), eq(navMenus.isActive, true)))
      .limit(1);
    if (!menu) return [];

    const rows = await tx
      .select({
        id: navMenuItems.id,
        kind: navMenuItems.kind,
        label: navMenuItems.label,
        url: navMenuItems.url,
        openInNewTab: navMenuItems.openInNewTab,
        pageSlug: contentEntries.slug,
        categorySlug: categories.slug,
      })
      .from(navMenuItems)
      .leftJoin(contentEntries, eq(contentEntries.id, navMenuItems.contentEntryId))
      .leftJoin(categories, eq(categories.id, navMenuItems.categoryId))
      .where(
        and(
          eq(navMenuItems.storeId, storeId),
          eq(navMenuItems.menuId, menu.id),
          eq(navMenuItems.visible, true)
        )
      )
      .orderBy(asc(navMenuItems.displayOrder), asc(navMenuItems.createdAt));

    const links: ResolvedMenuLink[] = [];
    for (const r of rows) {
      const href =
        r.kind === "custom_link"
          ? r.url
          : r.kind === "page"
            ? r.pageSlug
              ? `/pages/${r.pageSlug}`
              : null
            : r.categorySlug
              ? `/category/${r.categorySlug}`
              : null;
      // A page/category item whose target was deleted resolves to no
      // href — skip it rather than link nowhere (its row still exists so
      // the admin can see and fix/remove it).
      if (!href) continue;
      links.push({ id: r.id, label: r.label, href, openInNewTab: r.openInNewTab });
    }
    return links;
  });
}
