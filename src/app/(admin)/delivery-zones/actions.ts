"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { deliveryZones } from "@/db/schema";

export type DeliveryZoneState = { error?: string; ok?: boolean };

function parseZoneForm(formData: FormData): { error: string } | { name: string; charge: string } {
  const name = String(formData.get("name") ?? "").trim();
  const charge = String(formData.get("charge") ?? "").trim();

  if (!name) return { error: "Zone name is required." };
  const chargeNum = Number(charge);
  if (!charge || Number.isNaN(chargeNum) || chargeNum < 0) {
    return { error: "Enter a valid delivery charge." };
  }
  return { name, charge };
}

export async function createDeliveryZone(
  _prevState: DeliveryZoneState,
  formData: FormData
): Promise<DeliveryZoneState> {
  const session = await requireStaffSession();
  const parsed = parseZoneForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  await withStoreContext(session.user.storeId, (tx) =>
    tx.insert(deliveryZones).values({
      storeId: session.user.storeId,
      name: parsed.name,
      charge: parsed.charge,
    })
  );

  revalidatePath("/delivery-zones");
  return { ok: true };
}

export async function updateDeliveryZone(
  zoneId: string,
  _prevState: DeliveryZoneState,
  formData: FormData
): Promise<DeliveryZoneState> {
  const session = await requireStaffSession();
  const parsed = parseZoneForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(deliveryZones)
      .set({ name: parsed.name, charge: parsed.charge, updatedAt: new Date() })
      .where(and(eq(deliveryZones.storeId, session.user.storeId), eq(deliveryZones.id, zoneId)))
  );

  revalidatePath("/delivery-zones");
  redirect("/delivery-zones");
}

// Safe to delete outright — orders.deliveryZoneId is `set null` on delete
// (src/db/schema/orders.ts), and every order already snapshots its own
// deliveryCharge at order time, so past orders are unaffected either way.
export async function deleteDeliveryZone(zoneId: string) {
  const session = await requireStaffSession();

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .delete(deliveryZones)
      .where(and(eq(deliveryZones.storeId, session.user.storeId), eq(deliveryZones.id, zoneId)))
  );

  revalidatePath("/delivery-zones");
}
