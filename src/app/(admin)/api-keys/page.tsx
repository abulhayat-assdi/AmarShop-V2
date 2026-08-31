import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { storefrontUrlFor } from "@/lib/tenant/resolve";
import { listApiKeys } from "@/lib/api/keys";
import { getTranslator } from "@/lib/i18n/server";
import { ApiKeysManager } from "./ApiKeysManager";

export default async function ApiKeysPage() {
  const session = await requireRole("admin");
  const { t } = await getTranslator();

  const keys = await listApiKeys(session.user.storeId);
  const [store] = await db
    .select({ slug: stores.slug, customDomain: stores.customDomain })
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const base = store ? `${storefrontUrlFor(store) ?? "https://<your-store>"}/api/v1` : "/api/v1";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("admin.apiKeys.title")}</h1>
        <p className="text-sm text-gray-600">{t("admin.apiKeys.intro")}</p>
        <p className="text-sm text-gray-600">
          {t("admin.apiKeys.docsHint")}{" "}
          <code className="font-mono text-xs">{base}</code>
          {" · "}
          <code className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>
        </p>
      </div>

      <ApiKeysManager keys={keys} />
    </div>
  );
}
