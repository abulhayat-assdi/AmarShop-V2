"use client";

import Link from "next/link";
import { useActionState } from "react";
import { COURIER_PROVIDER_LABELS } from "@/lib/courier/providers";
import type { CourierProvider, ShipmentStatus } from "@/lib/courier/types";
import { useTranslator } from "@/components/i18n-provider";
import {
  bookShipmentAction,
  cancelShipmentAction,
  refreshShipmentAction,
  type ShipmentActionState,
} from "../actions";

const SHIPMENT_STATUS_KEYS: Record<ShipmentStatus, string> = {
  pending: "admin.shipment.statusPending",
  booked: "admin.shipment.statusBooked",
  in_transit: "admin.shipment.statusInTransit",
  delivered: "admin.shipment.statusDelivered",
  returned: "admin.shipment.statusReturned",
  cancelled: "admin.shipment.statusCancelled",
  failed: "admin.shipment.statusFailed",
};

type ShipmentView = {
  id: string;
  provider: CourierProvider;
  status: ShipmentStatus;
  trackingCode: string | null;
  trackingUrl: string | null;
  charge: string | null;
  codAmount: string;
  lastStatusRaw: string | null;
  failureReason: string | null;
};

const EMPTY: ShipmentActionState = {};
const OPEN_STATUSES: ShipmentStatus[] = ["pending", "booked"];

function ActionButton({
  action,
  label,
  className,
}: {
  action: () => Promise<ShipmentActionState>;
  label: string;
  className: string;
}) {
  const [state, formAction, isPending] = useActionState(action, EMPTY);
  return (
    <span className="flex flex-col gap-1">
      <form action={formAction}>
        <button type="submit" disabled={isPending} className={className}>
          {isPending ? "…" : label}
        </button>
      </form>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </span>
  );
}

export function ShipmentPanel({
  orderId,
  hasActiveCourier,
  shipment,
}: {
  orderId: string;
  hasActiveCourier: boolean;
  shipment: ShipmentView | null;
}) {
  const t = useTranslator();

  if (!shipment) {
    return (
      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">{t("admin.shipment.title")}</h2>
        {hasActiveCourier ? (
          <ActionButton
            action={bookShipmentAction.bind(null, orderId)}
            label={t("admin.shipment.bookCourier")}
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          />
        ) : (
          <p className="text-sm text-gray-600">
            {t("admin.shipment.notConfigured")}{" "}
            <Link href="/courier-settings" className="underline">
              {t("admin.shipment.configureOne")}
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  const canCancel = OPEN_STATUSES.includes(shipment.status);

  return (
    <div className="rounded border p-4">
      <h2 className="mb-2 font-semibold">{t("admin.shipment.title")}</h2>
      <div className="flex flex-col gap-1 text-sm">
        <p>
          <span className="text-gray-500">{t("admin.shipment.courier")}</span>{" "}
          {COURIER_PROVIDER_LABELS[shipment.provider]}
        </p>
        <p>
          <span className="text-gray-500">{t("admin.shipment.status")}</span>{" "}
          {t(SHIPMENT_STATUS_KEYS[shipment.status])}
        </p>
        {shipment.trackingCode && (
          <p>
            <span className="text-gray-500">{t("admin.shipment.tracking")}</span>{" "}
            {shipment.trackingCode}
            {shipment.trackingUrl && (
              <>
                {" — "}
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {t("admin.shipment.track")}
                </a>
              </>
            )}
          </p>
        )}
        <p>
          <span className="text-gray-500">{t("admin.shipment.codToCollect")}</span> ৳
          {shipment.codAmount}
          {shipment.charge && <> · {t("admin.shipment.deliveryFee", { amount: shipment.charge })}</>}
        </p>
        {shipment.lastStatusRaw && (
          <p className="text-gray-500">
            {t("admin.shipment.courierSays", { raw: shipment.lastStatusRaw })}
          </p>
        )}
        {shipment.failureReason && <p className="text-red-600">{shipment.failureReason}</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {shipment.status === "failed" && hasActiveCourier && (
          <ActionButton
            action={bookShipmentAction.bind(null, orderId)}
            label={t("admin.shipment.retryBooking")}
            className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          />
        )}
        {shipment.trackingCode && shipment.status !== "cancelled" && shipment.status !== "failed" && (
          <ActionButton
            action={refreshShipmentAction.bind(null, orderId, shipment.id)}
            label={t("admin.shipment.refreshStatus")}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          />
        )}
        {canCancel && (
          <ActionButton
            action={cancelShipmentAction.bind(null, orderId, shipment.id)}
            label={t("admin.shipment.cancelShipment")}
            className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          />
        )}
      </div>
    </div>
  );
}
