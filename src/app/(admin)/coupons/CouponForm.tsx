"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { DateInput } from "@/components/date-input";
import { DISCOUNT_TYPES, DISCOUNT_TYPE_KEYS } from "@/lib/enum-labels";
import type { Coupon } from "@/db/schema";
import type { CouponState } from "./actions";

const initialState: CouponState = {};

export type CouponInitialValues = {
  code: string;
  type: Coupon["type"];
  value: string;
  minSubtotal: string;
  maxUses: string;
  maxUsesPerPhone: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function CouponForm({
  action,
  title,
  submitLabel,
  initialValues,
  clearOnSuccess,
}: {
  action: (prev: CouponState, formData: FormData) => Promise<CouponState>;
  title: string;
  submitLabel: string;
  initialValues?: CouponInitialValues;
  clearOnSuccess?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const t = useTranslator();
  const [code, setCode] = useState(initialValues?.code ?? "");
  const [type, setType] = useState<Coupon["type"]>(initialValues?.type ?? "percentage");
  const [value, setValue] = useState(initialValues?.value ?? "");
  const [minSubtotal, setMinSubtotal] = useState(initialValues?.minSubtotal ?? "");
  const [maxUses, setMaxUses] = useState(initialValues?.maxUses ?? "");
  const [maxUsesPerPhone, setMaxUsesPerPhone] = useState(initialValues?.maxUsesPerPhone ?? "");
  const [startsAt, setStartsAt] = useState(initialValues?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(initialValues?.endsAt ?? "");
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok && clearOnSuccess) {
      setCode("");
      setValue("");
      setMinSubtotal("");
      setMaxUses("");
      setMaxUsesPerPhone("");
      setStartsAt("");
      setEndsAt("");
    }
  }

  const numField = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">{title}</h2>
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.coupons.code")}
        <input
          name="code"
          required
          autoCapitalize="characters"
          placeholder={t("admin.coupons.codePlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`${numField} font-mono`}
        />
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.coupons.type")}
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as Coupon["type"])}
          className={numField}
        >
          {DISCOUNT_TYPES.map((dt) => (
            <option key={dt} value={dt}>
              {t(DISCOUNT_TYPE_KEYS[dt])}
            </option>
          ))}
        </select>
      </label>

      {type !== "free_delivery" && (
        <label className="flex flex-col gap-1">
          {t("admin.coupons.value")}
          <input
            name="value"
            type="number"
            step="0.01"
            min="0"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className={numField}
          />
          <span className="text-xs text-gray-500">
            {type === "percentage"
              ? t("admin.coupons.valueHintPercentage")
              : t("admin.coupons.valueHintFixed")}
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.coupons.minSubtotal")}
        <input
          name="minSubtotal"
          type="number"
          step="0.01"
          min="0"
          value={minSubtotal}
          onChange={(e) => setMinSubtotal(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          className={numField}
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.coupons.maxUses")}
          <input
            name="maxUses"
            type="number"
            min="0"
            step="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className={numField}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.coupons.maxUsesPerPhone")}
          <input
            name="maxUsesPerPhone"
            type="number"
            min="0"
            step="1"
            value={maxUsesPerPhone}
            onChange={(e) => setMaxUsesPerPhone(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className={numField}
          />
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.coupons.startsAt")}
          <DateInput
            name="startsAt"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={numField}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          {t("admin.coupons.endsAt")}
          <DateInput
            name="endsAt"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={numField}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        {t("admin.coupons.isActive")}
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : submitLabel}
      </button>
    </form>
  );
}
