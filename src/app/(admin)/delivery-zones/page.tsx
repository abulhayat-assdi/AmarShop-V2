import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { deliveryZones } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { DeliveryZoneForm } from "./DeliveryZoneForm";
import { DeleteZoneButton } from "./DeleteZoneButton";
import { createDeliveryZone } from "./actions";

export default async function DeliveryZonesPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx.select().from(deliveryZones).where(eq(deliveryZones.storeId, session.user.storeId))
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.deliveryZones.title")}</h1>
      <DeliveryZoneForm
        action={createDeliveryZone}
        title={t("admin.deliveryZones.addZoneTitle")}
        submitLabel={t("admin.deliveryZones.addZoneSubmit")}
        clearOnSuccess
      />
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.deliveryZones.colZone")}</th>
            <th className="py-2">{t("admin.deliveryZones.colCharge")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-4 text-gray-500">
                {t("admin.deliveryZones.noZones")}
              </td>
            </tr>
          ) : (
            rows.map((zone) => (
              <tr key={zone.id} className="border-b">
                <td className="py-2">{zone.name}</td>
                <td className="py-2">৳{zone.charge}</td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/delivery-zones/${zone.id}/edit`} className="text-sm underline">
                      {t("admin.deliveryZones.edit")}
                    </Link>
                    <DeleteZoneButton zoneId={zone.id} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
