"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { checkoutCustomFields } from "@/db/schema";

export type CheckoutFieldState = { error?: string; ok?: boolean };

const FIELD_TYPES = ["text", "textarea"] as const;
type FieldType = (typeof FIELD_TYPES)[number];

export async function addCheckoutFieldAction(
  _prev: CheckoutFieldState,
  formData: FormData
): Promise<CheckoutFieldState> {
  const session = await requirePermission("settings:manage");

  const label = String(formData.get("label") ?? "").trim();
  const rawType = String(formData.get("fieldType") ?? "text");
  const required = formData.get("required") != null;
  const displayOrderRaw = String(formData.get("displayOrder") ?? "0").trim();

  if (!label) return { error: "admin.checkoutSettings.errLabel" };
  const fieldType: FieldType = (FIELD_TYPES as readonly string[]).includes(rawType)
    ? (rawType as FieldType)
    : "text";
  const displayOrder = Number.isInteger(Number(displayOrderRaw)) ? Number(displayOrderRaw) : 0;

  await withStoreContext(session.user.storeId, (tx) =>
    tx.insert(checkoutCustomFields).values({
      storeId: session.user.storeId,
      label,
      fieldType,
      required,
      displayOrder,
    })
  );

  revalidatePath("/checkout-settings");
  return { ok: true };
}

export async function updateCheckoutFieldAction(
  fieldId: string,
  _prev: CheckoutFieldState,
  formData: FormData
): Promise<CheckoutFieldState> {
  const session = await requirePermission("settings:manage");

  const label = String(formData.get("label") ?? "").trim();
  const required = formData.get("required") != null;
  const active = formData.get("active") != null;
  const displayOrderRaw = String(formData.get("displayOrder") ?? "0").trim();

  if (!label) return { error: "admin.checkoutSettings.errLabel" };
  const displayOrder = Number.isInteger(Number(displayOrderRaw)) ? Number(displayOrderRaw) : 0;

  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .update(checkoutCustomFields)
      .set({ label, required, active, displayOrder, updatedAt: new Date() })
      .where(and(eq(checkoutCustomFields.id, fieldId), eq(checkoutCustomFields.storeId, session.user.storeId)))
  );

  revalidatePath("/checkout-settings");
  return { ok: true };
}

export async function deleteCheckoutFieldAction(fieldId: string): Promise<void> {
  const session = await requirePermission("settings:manage");
  await withStoreContext(session.user.storeId, (tx) =>
    tx
      .delete(checkoutCustomFields)
      .where(and(eq(checkoutCustomFields.id, fieldId), eq(checkoutCustomFields.storeId, session.user.storeId)))
  );
  revalidatePath("/checkout-settings");
}
