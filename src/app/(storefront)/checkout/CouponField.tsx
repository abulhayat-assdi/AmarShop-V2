"use client";

import { useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { ApplyCouponState } from "./actions";

export type AppliedCoupon = { code: string; discountAmount: number; freeDelivery: boolean };

// Presentational only — CheckoutForm owns the useActionState for
// applyCouponAction (so it can read state.applied straight off) and passes
// the pieces down. This form is a sibling of the checkout form, never
// nested. phone / zoneId go out as hidden fields so the server can enforce
// the per-phone cap and size a free-delivery waiver.
export function CouponField({
  state,
  formAction,
  isPending,
  applied,
  onRemove,
  phone,
  zoneId,
}: {
  state: ApplyCouponState;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  applied: AppliedCoupon | null;
  onRemove: () => void;
  phone: string;
  zoneId: string;
}) {
  const t = useTranslator();
  const [code, setCode] = useState("");

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded border border-green-400 bg-green-50 px-3 py-2 text-sm">
        <span className="text-green-800">
          {t("checkout.couponApplied", { code: applied.code })}
        </span>
        <button type="button" onClick={onRemove} className="text-green-800 underline">
          {t("checkout.couponRemove")}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          type="text"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t("checkout.couponPlaceholder")}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="deliveryZoneId" value={zoneId} />
        <button
          type="submit"
          disabled={isPending || !code.trim()}
          className="rounded border border-black px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          {isPending ? t("checkout.couponApplying") : t("checkout.couponApply")}
        </button>
      </div>
      {state.error && (
        <p className="text-sm text-red-700">{t(state.error.key, state.error.vars)}</p>
      )}
    </form>
  );
}
