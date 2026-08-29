"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { TrackedOrderView } from "@/lib/orders/lookup";
import { trackOrderAction, type TrackState } from "./actions";

const initial: TrackState = {};

function OrderResult({ order }: { order: TrackedOrderView }) {
  const t = useTranslator();

  const paymentLine =
    order.paymentMethod === "cod"
      ? t("track.payCod")
      : order.paymentStatus === "paid"
        ? t("track.payPaid")
        : t("track.payPending");

  return (
    <div className="flex flex-col gap-4 rounded border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {t("track.orderNumberHeading", { number: `#${String(order.orderNumber).padStart(4, "0")}` })}
        </h2>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
          {t(`track.status.${order.status}`)}
        </span>
      </div>
      <p className="text-sm text-gray-600">
        {t("track.placedOn", { date: new Date(order.placedAt).toLocaleDateString() })}
      </p>

      <ul className="flex flex-col gap-1 text-sm">
        {order.items.map((item, i) => (
          <li key={i} className="flex justify-between">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>৳{item.lineTotal}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span>{t("common.subtotal")}</span>
          <span>৳{order.subtotal}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("common.delivery")}</span>
          <span>৳{order.deliveryCharge}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>{t("common.total")}</span>
          <span>৳{order.total}</span>
        </div>
      </div>

      <div className="border-t pt-3 text-sm text-gray-600">
        <p>{paymentLine}</p>
        <p>{t("confirmation.deliveringTo", { address: order.address })}</p>
      </div>

      {order.shipment && (
        <div className="border-t pt-3 text-sm">
          <div className="font-semibold">{t("track.courierHeading")}</div>
          <p className="text-gray-600">{t(`track.shipmentStatus.${order.shipment.status}`)}</p>
          {order.shipment.trackingUrl && (
            <a
              href={order.shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {t("track.trackParcel")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function TrackForm() {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(trackOrderAction, initial);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("track.orderNumberLabel")}
          <input
            type="text"
            name="orderNumber"
            inputMode="numeric"
            placeholder={t("track.orderNumberPlaceholder")}
            autoComplete="off"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("track.phoneLabel")}
          <input
            type="tel"
            name="phone"
            inputMode="numeric"
            placeholder={t("track.phonePlaceholder")}
            autoComplete="off"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        {state.error && <p className="text-sm text-red-700">{t(state.error)}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("track.submitting") : t("track.submit")}
        </button>
      </form>

      {state.order && <OrderResult order={state.order} />}
    </div>
  );
}
