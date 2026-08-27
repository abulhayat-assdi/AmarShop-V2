"use client";

import Link from "next/link";
import { useActionState } from "react";
import { COURIER_PROVIDER_LABELS } from "@/lib/courier/providers";
import type { CourierProvider, ShipmentStatus } from "@/lib/courier/types";
import {
  bookShipmentAction,
  cancelShipmentAction,
  refreshShipmentAction,
  type ShipmentActionState,
} from "../actions";

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
  if (!shipment) {
    return (
      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">Shipment</h2>
        {hasActiveCourier ? (
          <ActionButton
            action={bookShipmentAction.bind(null, orderId)}
            label="Book courier"
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          />
        ) : (
          <p className="text-sm text-gray-600">
            No courier is set up yet —{" "}
            <Link href="/courier-settings" className="underline">
              configure one
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
      <h2 className="mb-2 font-semibold">Shipment</h2>
      <div className="flex flex-col gap-1 text-sm">
        <p>
          <span className="text-gray-500">Courier:</span>{" "}
          {COURIER_PROVIDER_LABELS[shipment.provider]}
        </p>
        <p className="capitalize">
          <span className="text-gray-500">Status:</span> {shipment.status.replace("_", " ")}
        </p>
        {shipment.trackingCode && (
          <p>
            <span className="text-gray-500">Tracking:</span> {shipment.trackingCode}
            {shipment.trackingUrl && (
              <>
                {" — "}
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  track
                </a>
              </>
            )}
          </p>
        )}
        <p>
          <span className="text-gray-500">COD to collect:</span> ৳{shipment.codAmount}
          {shipment.charge && <> · delivery ৳{shipment.charge}</>}
        </p>
        {shipment.lastStatusRaw && (
          <p className="text-gray-500">Courier says: {shipment.lastStatusRaw}</p>
        )}
        {shipment.failureReason && (
          <p className="text-red-600">{shipment.failureReason}</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {shipment.status === "failed" && hasActiveCourier && (
          <ActionButton
            action={bookShipmentAction.bind(null, orderId)}
            label="Retry booking"
            className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          />
        )}
        {shipment.trackingCode && shipment.status !== "cancelled" && shipment.status !== "failed" && (
          <ActionButton
            action={refreshShipmentAction.bind(null, orderId, shipment.id)}
            label="Refresh status"
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          />
        )}
        {canCancel && (
          <ActionButton
            action={cancelShipmentAction.bind(null, orderId, shipment.id)}
            label="Cancel shipment"
            className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          />
        )}
      </div>
    </div>
  );
}
