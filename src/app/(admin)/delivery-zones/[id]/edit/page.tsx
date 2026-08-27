import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { deliveryZones } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { DeliveryZoneForm } from "../../DeliveryZoneForm";
import { updateDeliveryZone } from "../../actions";

export default async function EditDeliveryZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaffSession();

  const [zone] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select()
      .from(deliveryZones)
      .where(and(eq(deliveryZones.storeId, session.user.storeId), eq(deliveryZones.id, id)))
      .limit(1)
  );

  if (!zone) notFound();
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.deliveryZones.editZoneTitle")}</h1>
      <DeliveryZoneForm
        action={updateDeliveryZone.bind(null, zone.id)}
        title={t("admin.deliveryZones.editZoneTitle")}
        submitLabel={t("admin.deliveryZones.saveChanges")}
        initialValues={{ name: zone.name, charge: zone.charge }}
      />
    </div>
  );
}
