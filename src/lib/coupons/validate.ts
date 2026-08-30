import { and, eq, sql } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import { coupons, couponRedemptions, type Coupon } from "@/db/schema";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

// The ONE place a coupon is judged. Both applyCouponAction (preview) and
// placeOrder (authoritative, inside the read tx) call this so the customer
// never sees one answer and gets charged another. All money in/out is a
// plain number rounded to 2dp, matching the .toFixed(2) convention
// everywhere else.

export type CouponEvaluation =
  | { ok: true; coupon: Coupon; discountAmount: number; freeDelivery: boolean }
  | { ok: false; reason: MessageRef };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function evaluateCoupon(
  tx: TenantTx,
  input: {
    storeId: string;
    code: string;
    subtotal: number;
    deliveryCharge: number;
    // null when the customer hasn't entered a phone yet (checkout preview);
    // the per-phone cap is only enforced once a phone is known.
    phone: string | null;
  }
): Promise<CouponEvaluation> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, reason: msg("coupon.errNotFound") };

  const [coupon] = await tx
    .select()
    .from(coupons)
    .where(and(eq(coupons.storeId, input.storeId), eq(coupons.code, code)))
    .limit(1);

  if (!coupon || !coupon.isActive) return { ok: false, reason: msg("coupon.errNotFound") };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, reason: msg("coupon.errNotStarted") };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { ok: false, reason: msg("coupon.errExpired") };
  }
  if (coupon.minSubtotal && input.subtotal < Number(coupon.minSubtotal)) {
    return { ok: false, reason: msg("coupon.errMinSubtotal", { amount: coupon.minSubtotal }) };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: msg("coupon.errExhausted") };
  }
  if (coupon.maxUsesPerPhone !== null && input.phone) {
    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          eq(couponRedemptions.customerPhone, input.phone)
        )
      );
    if (count >= coupon.maxUsesPerPhone) {
      return { ok: false, reason: msg("coupon.errPhoneLimit") };
    }
  }

  const freeDelivery = coupon.type === "free_delivery";
  let discountAmount: number;
  if (freeDelivery) {
    discountAmount = input.deliveryCharge;
  } else if (coupon.type === "percentage") {
    discountAmount = round2((input.subtotal * Number(coupon.value)) / 100);
  } else {
    discountAmount = Number(coupon.value);
  }

  // Never discount more than what the discount applies to, and never push a
  // total negative. free_delivery is capped at the actual delivery charge;
  // subtotal discounts are capped at the subtotal.
  const ceiling = freeDelivery ? input.deliveryCharge : input.subtotal;
  discountAmount = round2(Math.min(Math.max(discountAmount, 0), ceiling));

  return { ok: true, coupon, discountAmount, freeDelivery };
}
