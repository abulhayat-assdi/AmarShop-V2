"use client";

import { useActionState } from "react";
import { COURIER_PROVIDER_LABELS } from "@/lib/courier/providers";
import type { CourierProvider, ShipmentStatus } from "@/lib/courier/types";
import { SHIPMENT_STATUS_KEYS } from "@/lib/enum-labels";
import { useTranslator } from "@/components/i18n-provider";
import { cancelShipmentAction, refreshShipmentAction, type ShipmentActionState } from "../actions";
import { CourierSendControl } from "../CourierSendControl";

type ShipmentView = {
  id: string;
  provider: CourierProvider;
  status: ShipmentStatus;
  consignmentId: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  charge: string | null;
  codAmount: string;
  lastStatusRaw: string | null;
  failureReason: string | null;
};

const EMPTY: ShipmentActionState = {};
const OPEN_STATUSES: ShipmentStatus[] = ["pending", "booked"];
const CLOSED: ShipmentStatus[] = ["failed", "cancelled"];

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
  configuredProviders,
  activeProvider,
  shipment,
}: {
  orderId: string;
  configuredProviders: CourierProvider[];
  activeProvider: CourierProvider | null;
  shipment: ShipmentView | null;
}) {
  const t = useTranslator();

  // No shipment, or the last one failed / was cancelled → the send control
  // (0 / 1 / many configured couriers).
  if (!shipment || CLOSED.includes(shipment.status)) {
    return (
      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">{t("admin.shipment.title")}</h2>
        <CourierSendControl
          orderId={orderId}
          configuredProviders={configuredProviders}
          activeProvider={activeProvider}
          existing={
            shipment
              ? {
                  provider: shipment.provider,
                  status: shipment.status,
                  consignmentId: shipment.consignmentId,
                  trackingCode: shipment.trackingCode,
                  trackingUrl: shipment.trackingUrl,
                }
              : null
          }
        />
        {shipment?.failureReason && (
          <p className="mt-2 text-xs text-red-600">{shipment.failureReason}</p>
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
        {shipment.consignmentId && (
          <p>{t("admin.shipment.consignment", { id: shipment.consignmentId })}</p>
        )}
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a href={`/orders/${orderId}/label?download=1`} className="text-sm underline">
          {t("admin.shipment.downloadLabel")}
        </a>
        <a
          href={`/orders/${orderId}/label/print`}
          target="_blank"
          rel="noopener"
          className="text-sm underline"
        >
          {t("admin.shipment.printLabel")}
        </a>
        {shipment.trackingCode && (
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
