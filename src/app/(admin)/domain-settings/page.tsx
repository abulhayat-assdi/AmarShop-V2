import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { slugHostFor } from "@/lib/tenant/resolve";
import { dnsSetupFor, platformIpsFromEnv } from "@/lib/tenant/custom-domain";
import { getTranslator } from "@/lib/i18n/server";
import { DomainSettingsForm } from "./DomainSettingsForm";

export default async function DomainSettingsPage() {
  const session = await requireRole("admin");
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);
  const { t } = await getTranslator();

  const slugHost = store ? slugHostFor(store) : null;
  const platformIp = platformIpsFromEnv()[0] ?? null;
  const dnsSetup = store?.customDomain
    ? dnsSetupFor(store.customDomain, { slugHost, platformIp })
    : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.domain.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.domain.intro")}</p>

      <div className="rounded border p-4 text-sm">
        <div className="font-semibold">{t("admin.domain.freeSubdomain")}</div>
        <div className="mt-1 font-mono">{slugHost ?? "—"}</div>
      </div>

      <DomainSettingsForm
        customDomain={store?.customDomain ?? null}
        verified={!!store?.customDomainVerifiedAt}
        dnsSetup={dnsSetup}
      />
    </div>
  );
}
