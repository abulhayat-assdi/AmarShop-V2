import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { HomeLayoutForm } from "./HomeLayoutForm";

export default async function DefaultPagesPage() {
  const session = await requirePermission("settings:manage");
  const [store] = await db
    .select({
      homeShowCategories: stores.homeShowCategories,
      homeCategoriesOrder: stores.homeCategoriesOrder,
      homeShowNewArrivals: stores.homeShowNewArrivals,
      homeNewArrivalsOrder: stores.homeNewArrivalsOrder,
    })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.defaultPages.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.defaultPages.intro")}</p>
      <HomeLayoutForm
        homeShowCategories={store?.homeShowCategories ?? true}
        homeCategoriesOrder={store?.homeCategoriesOrder ?? 1}
        homeShowNewArrivals={store?.homeShowNewArrivals ?? true}
        homeNewArrivalsOrder={store?.homeNewArrivalsOrder ?? 2}
      />
    </div>
  );
}
