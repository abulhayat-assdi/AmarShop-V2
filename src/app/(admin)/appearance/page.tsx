import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { AppearanceForm } from "./AppearanceForm";

export default async function AppearancePage() {
  const session = await requirePermission("settings:manage");
  const [store] = await db
    .select({
      logoUrl: stores.logoUrl,
      primaryColor: stores.primaryColor,
      footerTagline: stores.footerTagline,
      socialWhatsapp: stores.socialWhatsapp,
      socialFacebook: stores.socialFacebook,
      socialInstagram: stores.socialInstagram,
    })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.appearance.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.appearance.intro")}</p>
      <AppearanceForm
        logoUrl={store?.logoUrl ?? null}
        primaryColor={store?.primaryColor ?? null}
        footerTagline={store?.footerTagline ?? null}
        socialWhatsapp={store?.socialWhatsapp ?? null}
        socialFacebook={store?.socialFacebook ?? null}
        socialInstagram={store?.socialInstagram ?? null}
      />
    </div>
  );
}
