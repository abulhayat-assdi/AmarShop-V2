import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { deliveryZones } from "@/db/schema";
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

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit delivery zone</h1>
      <DeliveryZoneForm
        action={updateDeliveryZone.bind(null, zone.id)}
        title="Edit delivery zone"
        submitLabel="Save changes"
        initialValues={{ name: zone.name, charge: zone.charge }}
      />
    </div>
  );
}
