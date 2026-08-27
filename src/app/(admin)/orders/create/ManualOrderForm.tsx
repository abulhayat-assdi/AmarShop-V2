"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { DeliveryZone } from "@/db/schema";
import { createManualOrder, type ManualOrderField, type ManualOrderState } from "../actions";

type ProductRow = {
  variantId: string;
  productName: string;
  sku: string;
  price: string;
  discountedPrice: string | null;
  available: number;
};

type LineState = { variantId: string; quantity: number };

const initialState: ManualOrderState = {};

function unitPriceOf(row: ProductRow): number {
  return Number(row.discountedPrice ?? row.price);
}

export function ManualOrderForm({
  products,
  zones,
}: {
  products: ProductRow[];
  zones: DeliveryZone[];
}) {
  const [state, formAction, isPending] = useActionState(createManualOrder, initialState);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<LineState[]>([]);

  const byVariant = useMemo(
    () => new Map(products.map((row) => [row.variantId, row])),
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (row) =>
          row.productName.toLowerCase().includes(q) || row.sku.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, query]);

  function addProduct(variantId: string) {
    const row = byVariant.get(variantId);
    if (!row) return;
    setLines((prev) => {
      const existing = prev.find((line) => line.variantId === variantId);
      if (existing) {
        return prev.map((line) =>
          line.variantId === variantId
            ? { ...line, quantity: Math.min(line.quantity + 1, Math.max(row.available, 1)) }
            : line
        );
      }
      return [...prev, { variantId, quantity: 1 }];
    });
  }

  function setQty(variantId: string, next: number) {
    const row = byVariant.get(variantId);
    const max = Math.max(row?.available ?? 1, 1);
    const clamped = Number.isFinite(next) ? Math.min(Math.max(Math.trunc(next), 1), max) : 1;
    setLines((prev) =>
      prev.map((line) => (line.variantId === variantId ? { ...line, quantity: clamped } : line))
    );
  }

  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((line) => line.variantId !== variantId));
  }

  const selectedZone = zones.find((zone) => zone.id === zoneId);
  const deliveryCharge = selectedZone ? Number(selectedZone.charge) : 0;
  const subtotal = lines.reduce((sum, line) => {
    const row = byVariant.get(line.variantId);
    return sum + (row ? unitPriceOf(row) * line.quantity : 0);
  }, 0);
  const total = subtotal + deliveryCharge;

  function errorBorder(field: ManualOrderField) {
    return state.field === field ? "border-red-500" : "border-gray-300";
  }

  function blurOnWheel(e: React.WheelEvent<HTMLInputElement>) {
    e.currentTarget.blur();
  }

  const linesPayload = JSON.stringify(
    lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <input type="hidden" name="lines" value={linesPayload} />

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Customer</legend>
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
          Email (optional)
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Items</legend>
        <input
          type="text"
          placeholder="Search products by name or SKU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`rounded border px-3 py-2 ${errorBorder("lines")}`}
        />
        {products.length === 0 ? (
          <p className="text-sm text-amber-600">
            No active products yet — <Link href="/products/create" className="underline">add one</Link>{" "}
            first.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded border text-sm">
            {filtered.map((row) => (
              <li key={row.variantId} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  {row.productName} <span className="text-gray-400">({row.sku})</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ৳{unitPriceOf(row).toFixed(2)} · {row.available} in stock
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => addProduct(row.variantId)}
                  disabled={row.available < 1}
                  className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                >
                  Add
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-gray-500">No products match “{query}”.</li>
            )}
          </ul>
        )}

        {lines.length > 0 && (
          <ul className="flex flex-col gap-2">
            {lines.map((line) => {
              const row = byVariant.get(line.variantId);
              if (!row) return null;
              return (
                <li
                  key={line.variantId}
                  className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                >
                  <span className="flex-1">
                    {row.productName} <span className="text-gray-400">({row.sku})</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ৳{unitPriceOf(row).toFixed(2)} each
                    </span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(row.available, 1)}
                    step={1}
                    value={line.quantity}
                    onWheel={blurOnWheel}
                    onChange={(e) => setQty(line.variantId, Number(e.target.value))}
                    className="w-16 rounded border border-gray-300 px-2 py-1"
                  />
                  <span className="w-20 text-right">
                    ৳{(unitPriceOf(row) * line.quantity).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.variantId)}
                    className="text-xs text-red-600 underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">Delivery</legend>
        {zones.length === 0 ? (
          <p className="text-sm text-amber-600">
            No delivery zones configured —{" "}
            <Link href="/delivery-zones" className="underline">
              add one
            </Link>{" "}
            before creating an order.
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
        <legend className="font-semibold">Payment</legend>
        <p className="text-sm text-gray-600">Cash on Delivery</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="alreadyPaid"
            checked={alreadyPaid}
            onChange={(e) => setAlreadyPaid(e.target.checked)}
          />
          Payment already received (cash / bKash in person)
        </label>
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
          <span>Subtotal ({lines.length} item{lines.length === 1 ? "" : "s"})</span>
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
        disabled={isPending || lines.length === 0 || zones.length === 0}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Creating order…" : "Create order"}
      </button>
    </form>
  );
}
