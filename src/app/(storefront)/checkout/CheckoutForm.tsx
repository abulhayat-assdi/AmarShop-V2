"use client";

import { useActionState, useState } from "react";
import { placeOrder, type PlaceOrderField, type PlaceOrderState } from "./actions";
import type { DeliveryZone } from "@/db/schema";

const initialState: PlaceOrderState = {};

export function CheckoutForm({ subtotal, zones }: { subtotal: number; zones: DeliveryZone[] }) {
  const [state, formAction, isPending] = useActionState(placeOrder, initialState);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sslcommerz">("cod");

  const selectedZone = zones.find((zone) => zone.id === zoneId);
  const deliveryCharge = selectedZone ? Number(selectedZone.charge) : 0;
  const total = subtotal + deliveryCharge;

  function errorBorder(field: PlaceOrderField) {
    return state.field === field ? "border-red-500" : "border-gray-300";
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        Full Name
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`rounded border px-3 py-2 ${errorBorder("name")}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        Phone Number
        <input
          name="phone"
          required
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={`rounded border px-3 py-2 ${errorBorder("phone")}`}
        />
      </label>
      <label className="flex flex-col gap-1">
        Complete Address
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
        Email (optional, for payment receipt)
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Delivery</legend>
        {zones.length === 0 ? (
          <p className="text-sm text-amber-600">
            No delivery zones configured yet — the merchant needs to add one before checkout can
            complete.
          </p>
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Payment Method</legend>
        <label className="flex items-center gap-2 rounded border p-3">
          <input
            type="radio"
            name="paymentMethod"
            value="cod"
            checked={paymentMethod === "cod"}
            onChange={() => setPaymentMethod("cod")}
          />
          Cash on Delivery
        </label>
        <label className="flex items-center gap-2 rounded border p-3">
          <input
            type="radio"
            name="paymentMethod"
            value="sslcommerz"
            checked={paymentMethod === "sslcommerz"}
            onChange={() => setPaymentMethod("sslcommerz")}
          />
          Online Payment — bKash, Nagad, DBBL Nexus, Visa, Mastercard
        </label>
        {paymentMethod === "sslcommerz" && (
          <p className="text-xs text-gray-500">
            You&apos;ll be redirected to a secure payment page to complete this.
          </p>
        )}
      </fieldset>

      <label className="flex flex-col gap-1">
        Order Notes (optional)
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
          <span>Subtotal</span>
          <span>৳{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>৳{deliveryCharge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>৳{total.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || zones.length === 0}
        className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Placing order…" : "Place Order"}
      </button>
    </form>
  );
}
