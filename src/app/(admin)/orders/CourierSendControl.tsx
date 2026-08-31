"use client";

import Link from "next/link";
import { useActionState } from "react";
import { COURIER_PROVIDER_LABELS } from "@/lib/courier/providers";
import type { CourierProvider } from "@/lib/courier/types";
import type { ShipmentBrief } from "@/lib/courier/shipments";
import { SHIPMENT_STATUS_KEYS } from "@/lib/enum-labels";
import { useTranslator } from "@/components/i18n-provider";
import { sendToCourierAction, type ShipmentActionState } from "./actions";

const EMPTY: ShipmentActionState = {};
const OPEN = ["pending", "booked", "in_transit", "delivered", "returned"];

export function CourierSendControl({
  orderId,
  configuredProviders,
  activeProvider,
  existing,
  compact = false,
}: {
  orderId: string;
  configuredProviders: CourierProvider[];
  activeProvider: CourierProvider | null;
  existing: ShipmentBrief | null;
  compact?: boolean;
}) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(
    sendToCourierAction.bind(null, orderId),
    EMPTY
  );

  const btn =
    "rounded bg-black px-3 py-1.5 text-xs text-white hover:bg-gray-800 disabled:opacity-50";
  const input = "rounded border border-gray-300 px-2 py-1 text-xs";

  // Already shipped (an open shipment with a consignment) → show the ref +
  // the label download / print, no send button.
  if (existing && OPEN.includes(existing.status) && existing.consignmentId) {
    return (
      <div className="flex flex-col gap-1 text-xs">
        <span>
          {COURIER_PROVIDER_LABELS[existing.provider]} ·{" "}
          <span className="text-gray-500">{t(SHIPMENT_STATUS_KEYS[existing.status])}</span>
        </span>
        <span className="text-gray-600">
          {t("admin.shipment.consignment", { id: existing.consignmentId })}
        </span>
        <span className="flex flex-wrap gap-2">
          <a href={`/orders/${orderId}/label?download=1`} className="underline">
            {t("admin.shipment.downloadLabel")}
          </a>
          <a
            href={`/orders/${orderId}/label/print`}
            target="_blank"
            rel="noopener"
            className="underline"
          >
            {t("admin.shipment.printLabel")}
          </a>
          {existing.trackingUrl && (
            <a href={existing.trackingUrl} target="_blank" rel="noopener" className="underline">
              {t("admin.shipment.track")}
            </a>
          )}
        </span>
      </div>
    );
  }

  if (configuredProviders.length === 0) {
    return (
      <span className="text-xs text-gray-400">
        —{" "}
        <Link href="/courier-settings" className="underline">
          {t("admin.shipment.setUp")}
        </Link>
      </span>
    );
  }

  const showFailedNote = existing?.status === "failed";
  const defaultProvider =
    activeProvider && configuredProviders.includes(activeProvider)
      ? activeProvider
      : configuredProviders[0];

  return (
    <div className={`flex flex-col gap-1 ${compact ? "" : "text-sm"}`}>
      {showFailedNote && (
        <span className="text-xs text-amber-700">{t("admin.shipment.lastAttemptFailed")}</span>
      )}
      <form action={formAction} className="flex flex-wrap items-center gap-1">
        {configuredProviders.length === 1 ? (
          <>
            <input type="hidden" name="provider" value={configuredProviders[0]} />
            <button type="submit" disabled={isPending} className={btn}>
              {isPending
                ? "…"
                : t("admin.shipment.sendTo", {
                    courier: COURIER_PROVIDER_LABELS[configuredProviders[0]],
                  })}
            </button>
          </>
        ) : (
          <>
            <select name="provider" defaultValue={defaultProvider} className={input}>
              {configuredProviders.map((p) => (
                <option key={p} value={p}>
                  {COURIER_PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
            <button type="submit" disabled={isPending} className={btn}>
              {isPending ? "…" : t("admin.shipment.send")}
            </button>
          </>
        )}
      </form>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </div>
  );
}
