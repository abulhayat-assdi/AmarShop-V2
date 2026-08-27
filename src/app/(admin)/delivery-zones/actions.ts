"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { deliveryZones } from "@/db/schema";

export type CreateDeliveryZoneState = { error?: string; ok?: boolean };

export async function createDeliveryZone(
  _prevState: CreateDeliveryZoneState,
  formData: FormData
): Promise<CreateDeliveryZoneState> {
  const session = await requireStaffSession();
  const name = String(formData.get("name") ?? "").trim();
  const charge = String(formData.get("charge") ?? "").trim();

  if (!name) {
    return { error: "Zone name is required." };
  }
  const chargeNum = Number(charge);
  if (!charge || Number.isNaN(chargeNum) || chargeNum < 0) {
    return { error: "Enter a valid delivery charge." };
  }

  await withStoreContext(session.user.storeId, (tx) =>
    tx.insert(deliveryZones).values({
      storeId: session.user.storeId,
      name,
      charge: charge,
    })
  );

  revalidatePath("/delivery-zones");
  return { ok: true };
}
