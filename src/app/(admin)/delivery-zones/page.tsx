import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { deliveryZones } from "@/db/schema";
import { CreateDeliveryZoneForm } from "./CreateDeliveryZoneForm";

export default async function DeliveryZonesPage() {
  const session = await requireStaffSession();

  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx.select().from(deliveryZones).where(eq(deliveryZones.storeId, session.user.storeId))
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Delivery Zones</h1>
      <CreateDeliveryZoneForm />
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Zone</th>
            <th className="py-2">Charge</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-4 text-gray-500">
                No delivery zones yet — checkout needs at least one to compute shipping.
              </td>
            </tr>
          ) : (
            rows.map((zone) => (
              <tr key={zone.id} className="border-b">
                <td className="py-2">{zone.name}</td>
                <td className="py-2">৳{zone.charge}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
