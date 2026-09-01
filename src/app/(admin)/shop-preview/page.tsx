import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { storefrontUrlFor } from "@/lib/tenant/resolve";
import { getTranslator } from "@/lib/i18n/server";
import { ShopPreviewFrame } from "./ShopPreviewFrame";

export default async function ShopPreviewPage() {
  const session = await requireStaffSession();
  const [store] = await db
    .select({ slug: stores.slug, customDomain: stores.customDomain })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const { t } = await getTranslator();
  const url = store ? storefrontUrlFor(store) : null;

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("admin.shopPreview.title")}</h1>
      {url ? (
        <ShopPreviewFrame url={url} />
      ) : (
        <p className="text-sm text-gray-500">{t("admin.shopPreview.unavailable")}</p>
      )}
    </div>
  );
}
