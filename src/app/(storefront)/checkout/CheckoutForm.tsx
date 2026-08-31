"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { BD_PHONE_PATTERN } from "@/lib/phone";
import {
  applyCouponAction,
  placeOrder,
  type ApplyCouponState,
  type PlaceOrderField,
  type PlaceOrderState,
} from "./actions";
import { saveCheckoutLeadAction } from "./lead-actions";
import { CouponField, type AppliedCoupon } from "./CouponField";
import type { ManualWalletConfig } from "@/lib/payments/settings";
import type { DeliveryZone } from "@/db/schema";

const initialState: PlaceOrderState = {};
const initialCouponState: ApplyCouponState = {};

type PaymentChoice = "cod" | "sslcommerz" | "manual_wallet";

export function CheckoutForm({
  subtotal,
  zones,
  manualWallet,
  digitalOnly,
}: {
  subtotal: number;
  zones: DeliveryZone[];
  manualWallet: ManualWalletConfig | null;
  digitalOnly: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    placeOrder,
    initialState,
  );
  const [couponState, couponAction, couponPending] = useActionState(
    applyCouponAction,
    initialCouponState,
  );
  const t = useTranslator();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentChoice>(
    digitalOnly ? "sslcommerz" : "cod",
  );
  const walletChoices: ("bkash" | "nagad")[] = [
    ...(manualWallet?.bkashNumber ? (["bkash"] as const) : []),
    ...(manualWallet?.nagadNumber ? (["nagad"] as const) : []),
  ];
  const [walletProvider, setWalletProvider] = useState<"bkash" | "nagad">(
    walletChoices[0] ?? "bkash",
  );
  const [senderMsisdn, setSenderMsisdn] = useState("");
  const [customerReference, setCustomerReference] = useState("");

  // Incomplete-checkout lead capture: once a name + a valid phone are
  // entered, debounce-save the contact details so the merchant can call to
  // confirm if the customer never finishes. Fire-and-forget; re-fires as
  // fields change. placeOrder marks the lead "converted" on success.
  const leadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!name.trim() || !BD_PHONE_PATTERN.test(phone)) return;
    if (leadTimer.current) clearTimeout(leadTimer.current);
    leadTimer.current = setTimeout(() => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("phone", phone);
      fd.set("address", address);
      fd.set("deliveryZoneId", zoneId);
      void saveCheckoutLeadAction(fd);
    }, 1500);
    return () => {
      if (leadTimer.current) clearTimeout(leadTimer.current);
    };
  }, [name, phone, address, zoneId]);

  // Render-time reconcile (same pattern as DeliveryZoneForm): a fresh
  // couponState.applied clears any prior "removed" dismissal.
  const [handledCoupon, setHandledCoupon] = useState(couponState);
  const [dismissed, setDismissed] = useState(false);
  if (couponState !== handledCoupon) {
    setHandledCoupon(couponState);
    if (couponState.applied) setDismissed(false);
  }
  const applied: AppliedCoupon | null =
    dismissed || !couponState.applied ? null : couponState.applied;

  const selectedZone = zones.find((zone) => zone.id === zoneId);
  const deliveryCharge = selectedZone ? Number(selectedZone.charge) : 0;
  const discount = applied ? applied.discountAmount : 0;
  const total = Math.max(0, subtotal - discount + deliveryCharge);

  function errorBorder(field: PlaceOrderField) {
    return state.field === field ? "border-red-500" : "border-gray-300";
  }

  return (
    <div className="flex flex-col gap-4">
      <CouponField
        state={couponState}
        formAction={couponAction}
        isPending={couponPending}
        applied={applied}
        onRemove={() => setDismissed(true)}
        phone={phone}
        zoneId={zoneId}
      />
      <form action={formAction} className="flex flex-col gap-4">
        {applied && (
          <input type="hidden" name="couponCode" value={applied.code} />
        )}
        {state.error && (
          <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
            {t(state.error.key, state.error.vars)}
          </p>
        )}

        <label className="flex flex-col gap-1">
          {t("checkout.fullName")}
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("name")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("checkout.phone")}
          <input
            name="phone"
            required
            placeholder={t("checkout.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("phone")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("checkout.address")}
          <textarea
            name="address"
            required
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`rounded border px-3 py-2 ${errorBorder("address")}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("checkout.emailOptional")}
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>

        {digitalOnly ? (
          <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {t("checkout.digitalOnlyNote")}
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">
              {t("checkout.delivery")}
            </legend>
            {zones.length === 0 ? (
              <p className="text-sm text-amber-600">{t("checkout.noZones")}</p>
            ) : (
              zones.map((zone) => (
                <label
                  key={zone.id}
                  className={`flex items-center justify-between gap-2 rounded border p-3 ${
                    state.field === "deliveryZoneId" ? "border-red-500" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="deliveryZoneId"
                      value={zone.id}
                      checked={zoneId === zone.id}
                      onChange={() => setZoneId(zone.id)}
                    />
                    {zone.name}
                  </span>
                  <span>৳{zone.charge}</span>
                </label>
              ))
            )}
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">
            {t("checkout.paymentMethod")}
          </legend>
          {!digitalOnly && (
            <label className="flex items-center gap-2 rounded border p-3">
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              {t("common.paymentCod")}
            </label>
          )}
          <label className="flex items-center gap-2 rounded border p-3">
            <input
              type="radio"
              name="paymentMethod"
              value="sslcommerz"
              checked={paymentMethod === "sslcommerz"}
              onChange={() => setPaymentMethod("sslcommerz")}
            />
            {t("checkout.onlinePayment")}
          </label>
          {paymentMethod === "sslcommerz" && (
            <p className="text-xs text-gray-500">{t("checkout.onlineHint")}</p>
          )}

          {manualWallet && (
            <label className="flex items-center gap-2 rounded border p-3">
              <input
                type="radio"
                name="paymentMethod"
                value="manual_wallet"
                checked={paymentMethod === "manual_wallet"}
                onChange={() => setPaymentMethod("manual_wallet")}
              />
              {t("checkout.walletOption")}
            </label>
          )}
          {manualWallet && paymentMethod === "manual_wallet" && (
            <div className="flex flex-col gap-3 rounded border bg-gray-50 p-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{t("checkout.walletSendTo")}</span>
                {manualWallet.bkashNumber && (
                  <span>
                    {t("common.walletBkash")}: <span className="font-mono">{manualWallet.bkashNumber}</span>
                  </span>
                )}
                {manualWallet.nagadNumber && (
                  <span>
                    {t("common.walletNagad")}: <span className="font-mono">{manualWallet.nagadNumber}</span>
                  </span>
                )}
              </div>
              {manualWallet.instructions && (
                <p className="whitespace-pre-wrap text-gray-600">{manualWallet.instructions}</p>
              )}
              <label className="flex flex-col gap-1">
                {t("checkout.walletProviderLabel")}
                <select
                  name="walletProvider"
                  required
                  value={walletProvider}
                  onChange={(e) => setWalletProvider(e.target.value as "bkash" | "nagad")}
                  className="rounded border border-gray-300 px-3 py-2"
                >
                  {walletChoices.map((w) => (
                    <option key={w} value={w}>
                      {w === "bkash" ? t("common.walletBkash") : t("common.walletNagad")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                {t("checkout.walletSender")}
                <input
                  name="senderMsisdn"
                  required
                  inputMode="numeric"
                  placeholder={t("checkout.phonePlaceholder")}
                  value={senderMsisdn}
                  onChange={(e) => setSenderMsisdn(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                {t("checkout.walletRef")}
                <input
                  name="customerReference"
                  required
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2 font-mono"
                />
              </label>
              <p className="text-xs text-gray-500">{t("checkout.walletHint")}</p>
            </div>
          )}
        </fieldset>

        <label className="flex flex-col gap-1">
          {t("checkout.orderNotes")}
          <textarea
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1 rounded border p-4 text-sm">
          <div className="flex justify-between">
            <span>{t("common.subtotal")}</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>
                {t("checkout.discount")}
                {applied ? ` (${applied.code})` : ""}
              </span>
              <span>−৳{discount.toFixed(2)}</span>
            </div>
          )}
          {!digitalOnly && (
            <div className="flex justify-between">
              <span>{t("common.delivery")}</span>
              <span>৳{deliveryCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <span>{t("common.total")}</span>
            <span>৳{total.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || (!digitalOnly && zones.length === 0)}
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("checkout.placingOrder") : t("checkout.placeOrder")}
        </button>
      </form>
    </div>
  );
}
