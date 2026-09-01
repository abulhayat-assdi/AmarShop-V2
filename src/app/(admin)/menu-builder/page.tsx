import { asc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { contentEntries, categories } from "@/db/schema";
import { getMenuItemsForAdmin } from "@/lib/menus/query";
import { getTranslator } from "@/lib/i18n/server";
import { AddMenuItemForm } from "./AddMenuItemForm";
import { MenuItemRow } from "./MenuItemRow";

export default async function MenuBuilderPage() {
  const session = await requirePermission("settings:manage");
  const { items } = await getMenuItemsForAdmin(session.user.storeId);
  const { t } = await getTranslator();

  const [pages, categoryRows] = await withStoreContext(session.user.storeId, async (tx) => [
    await tx
      .select({ id: contentEntries.id, title: contentEntries.title })
      .from(contentEntries)
      .where(eq(contentEntries.storeId, session.user.storeId))
      .orderBy(asc(contentEntries.title)),
    await tx
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.storeId, session.user.storeId))
      .orderBy(asc(categories.name)),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.menuBuilder.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.menuBuilder.intro")}</p>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.menuBuilder.addTitle")}</h2>
        <AddMenuItemForm pages={pages} categories={categoryRows} />
      </section>

      {items.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">{t("admin.menuBuilder.itemsTitle")}</h2>
          {items.map((item) => (
            <MenuItemRow key={item.id} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
