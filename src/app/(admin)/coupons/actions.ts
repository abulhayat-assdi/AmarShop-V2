"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { coupons, couponRedemptions } from "@/db/schema";
import { DISCOUNT_TYPES } from "@/lib/enum-labels";
import type { Coupon } from "@/db/schema";

export type CouponState = { error?: string; ok?: boolean };

type ParsedCoupon = {
  code: string;
  type: Coupon["type"];
  value: string;
  minSubtotal: string | null;
  maxUses: number | null;
  maxUsesPerPhone: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

function optInt(raw: string): { ok: true; value: number | null } | { ok: false } {
  const s = raw.trim();
  if (!s) return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

function parseCouponForm(formData: FormData): { error: string } | ParsedCoupon {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "admin.coupons.errCode" };

  const rawType = String(formData.get("type") ?? "");
  if (!(DISCOUNT_TYPES as string[]).includes(rawType)) return { error: "admin.coupons.errValue" };
  const type = rawType as Coupon["type"];

  let value = "0";
  if (type !== "free_delivery") {
    const v = Number(String(formData.get("value") ?? "").trim());
    if (!Number.isFinite(v) || v <= 0) return { error: "admin.coupons.errValue" };
    if (type === "percentage" && v > 100) return { error: "admin.coupons.errPercentRange" };
    value = v.toFixed(2);
  }

  const rawMin = String(formData.get("minSubtotal") ?? "").trim();
  let minSubtotal: string | null = null;
  if (rawMin) {
    const m = Number(rawMin);
    if (!Number.isFinite(m) || m < 0) return { error: "admin.coupons.errValue" };
    minSubtotal = m.toFixed(2);
  }

  const maxUses = optInt(String(formData.get("maxUses") ?? ""));
  if (!maxUses.ok) return { error: "admin.coupons.errNumber" };
  const maxUsesPerPhone = optInt(String(formData.get("maxUsesPerPhone") ?? ""));
  if (!maxUsesPerPhone.ok) return { error: "admin.coupons.errNumber" };

  const rawStarts = String(formData.get("startsAt") ?? "").trim();
  const rawEnds = String(formData.get("endsAt") ?? "").trim();
  const startsAt = rawStarts ? new Date(`${rawStarts}T00:00:00`) : null;
  const endsAt = rawEnds ? new Date(`${rawEnds}T23:59:59`) : null;
  if (startsAt && endsAt && endsAt < startsAt) return { error: "admin.coupons.errDateOrder" };

  return {
    code,
    type,
    value,
    minSubtotal,
    maxUses: maxUses.value,
    maxUsesPerPhone: maxUsesPerPhone.value,
    startsAt,
    endsAt,
    isActive: formData.get("isActive") === "on",
  };
}

// Postgres unique_violation on (store_id, code).
function isCodeTaken(err: unknown): boolean {
  const cause = (err as { cause?: unknown } | null)?.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "23505" &&
    (cause as { constraint_name?: string }).constraint_name === "coupons_store_id_code_idx"
  );
}

export async function createCoupon(
  _prev: CouponState,
  formData: FormData
): Promise<CouponState> {
  const session = await requireRole("admin");
  const parsed = parseCouponForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await withStoreContext(session.user.storeId, (tx) =>
      tx.insert(coupons).values({ storeId: session.user.storeId, ...parsed })
    );
  } catch (err) {
    if (isCodeTaken(err)) return { error: "admin.coupons.errCodeTaken" };
    throw err;
  }

  revalidatePath("/coupons");
  return { ok: true };
}

export async function updateCoupon(
  couponId: string,
  _prev: CouponState,
  formData: FormData
): Promise<CouponState> {
  const session = await requireRole("admin");
  const parsed = parseCouponForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await withStoreContext(session.user.storeId, (tx) =>
      tx
        .update(coupons)
        .set({ ...parsed, updatedAt: new Date() })
        .where(and(eq(coupons.storeId, session.user.storeId), eq(coupons.id, couponId)))
    );
  } catch (err) {
    if (isCodeTaken(err)) return { error: "admin.coupons.errCodeTaken" };
    throw err;
  }

  revalidatePath("/coupons");
  redirect("/coupons");
}

// A coupon with redemptions can't be hard-deleted (orders reference it via
// coupon_redemptions). Deactivate instead; hard-delete only when unused.
export async function deleteCoupon(couponId: string) {
  const session = await requireRole("admin");

  await withStoreContext(session.user.storeId, async (tx) => {
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.storeId, session.user.storeId),
          eq(couponRedemptions.couponId, couponId)
        )
      );

    if (count > 0) {
      await tx
        .update(coupons)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(coupons.storeId, session.user.storeId), eq(coupons.id, couponId)));
    } else {
      await tx
        .delete(coupons)
        .where(and(eq(coupons.storeId, session.user.storeId), eq(coupons.id, couponId)));
    }
  });

  revalidatePath("/coupons");
}
