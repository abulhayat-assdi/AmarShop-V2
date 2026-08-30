"use client";

import { useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { deleteCoupon } from "./actions";

// Inline two-step confirm, no native confirm() (CLAUDE.md). The prompt
// wording differs by whether the coupon has been used: a used coupon is
// deactivated rather than deleted, since orders reference it.
export function DeleteCouponButton({ couponId, hasUses }: { couponId: string; hasUses: boolean }) {
  const t = useTranslator();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">
          {hasUses ? t("admin.coupons.deactivateQ") : t("admin.coupons.deleteQ")}
        </span>
        <form action={deleteCoupon.bind(null, couponId)}>
          <button type="submit" className="text-red-600 underline">
            {t("admin.coupons.confirm")}
          </button>
        </form>
        <button type="button" onClick={() => setConfirming(false)} className="underline">
          {t("admin.coupons.cancel")}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm text-red-600 underline"
    >
      {t("admin.coupons.delete")}
    </button>
  );
}
