import { requireRole } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { listEndpoints, listRecentDeliveries } from "@/lib/webhooks/endpoints";
import { WebhooksManager } from "./WebhooksManager";

export default async function WebhooksPage() {
  const session = await requireRole("admin");
  const { t } = await getTranslator();

  const [endpoints, deliveries] = await Promise.all([
    listEndpoints(session.user.storeId),
    listRecentDeliveries(session.user.storeId),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("admin.webhooks.title")}</h1>
        <p className="text-sm text-gray-600">{t("admin.webhooks.intro")}</p>
        <p className="text-sm text-gray-600">
          {t("admin.webhooks.docsHint")}{" "}
          <code className="font-mono text-xs">X-AmarShop-Signature</code>
          {" · "}
          <code className="font-mono text-xs">X-AmarShop-Event</code>
          {" · "}
          <code className="font-mono text-xs">X-AmarShop-Delivery</code>
        </p>
      </div>

      <WebhooksManager endpoints={endpoints} deliveries={deliveries} />
    </div>
  );
}
