"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABEL_KEYS } from "@/lib/webhooks/events";
import type { WebhookDeliveryView, WebhookEndpointView } from "@/lib/webhooks/endpoints";
import {
  createWebhookAction,
  deleteWebhookAction,
  resendDeliveryAction,
  setWebhookEnabledAction,
  type WebhookCreateState,
} from "./actions";

const initial: WebhookCreateState = {};

function fmtDateTime(d: Date | string | null): string {
  return d ? new Date(d).toLocaleString() : "—";
}

export function WebhooksManager({
  endpoints,
  deliveries,
}: {
  endpoints: WebhookEndpointView[];
  deliveries: WebhookDeliveryView[];
}) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(createWebhookAction, initial);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
        <span className="text-sm font-semibold">{t("admin.webhooks.createTitle")}</span>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.webhooks.urlLabel")}
          <input
            type="url"
            name="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://example.com/hooks/amarshop"
            className="rounded border border-gray-300 px-3 py-2 font-mono text-xs"
          />
        </label>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="font-medium">{t("admin.webhooks.eventsLabel")}</legend>
          {WEBHOOK_EVENTS.map((e) => (
            <label key={e} className="flex items-center gap-2">
              <input type="checkbox" name="events" value={e} defaultChecked />
              <span>
                {t(WEBHOOK_EVENT_LABEL_KEYS[e])}{" "}
                <span className="font-mono text-xs text-gray-500">{e}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {state.error && (
          <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
            {t(state.error)}
          </p>
        )}
        {state.ok && (
          <p className="rounded border border-green-500 bg-green-50 px-3 py-2 text-sm text-green-800">
            {t("admin.webhooks.created")}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("admin.webhooks.creating") : t("admin.webhooks.create")}
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t("admin.webhooks.endpointsTitle")}</h2>
        {endpoints.length === 0 ? (
          <p className="text-sm text-gray-500">{t("admin.webhooks.none")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {endpoints.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 rounded border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="break-all font-mono text-xs">{e.url}</code>
                  {e.disabledAt ? (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {t("admin.webhooks.statusDisabled")}
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      {t("admin.webhooks.statusActive")}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {e.events.map((ev) => (
                    <span key={ev} className="rounded bg-gray-100 px-1 font-mono text-xs">
                      {ev}
                    </span>
                  ))}
                </div>

                <SecretRow secret={e.secret} />

                <div className="flex gap-2">
                  <form action={setWebhookEnabledAction.bind(null, e.id, !!e.disabledAt)}>
                    <button
                      type="submit"
                      className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      {e.disabledAt ? t("admin.webhooks.enable") : t("admin.webhooks.disable")}
                    </button>
                  </form>
                  <form
                    action={deleteWebhookAction.bind(null, e.id)}
                    onSubmit={(ev) => {
                      if (!confirm(t("admin.webhooks.deleteConfirm"))) ev.preventDefault();
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded border border-red-400 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      {t("admin.webhooks.delete")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t("admin.webhooks.deliveriesTitle")}</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">{t("admin.webhooks.colEvent")}</th>
              <th className="py-2">{t("admin.webhooks.colEndpoint")}</th>
              <th className="py-2">{t("admin.webhooks.colStatus")}</th>
              <th className="py-2">{t("admin.webhooks.colResponse")}</th>
              <th className="py-2">{t("admin.webhooks.colAttempts")}</th>
              <th className="py-2">{t("admin.webhooks.colTime")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-gray-500">
                  {t("admin.webhooks.noDeliveries")}
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id} className="border-b align-top">
                  <td className="py-2 font-mono text-xs">{d.event}</td>
                  <td className="py-2">
                    <code className="break-all font-mono text-xs text-gray-500">
                      {d.endpointUrl ?? "—"}
                    </code>
                  </td>
                  <td className="py-2">
                    {d.status === "success" ? (
                      <span className="text-green-700">{t("admin.webhooks.statusSuccess")}</span>
                    ) : (
                      <span className="text-red-600">{t("admin.webhooks.statusFailed")}</span>
                    )}
                  </td>
                  <td className="py-2 text-xs text-gray-500">
                    {d.responseStatus ?? (d.error ? d.error.slice(0, 60) : "—")}
                  </td>
                  <td className="py-2 text-xs text-gray-500">{d.attempts}</td>
                  <td className="py-2 text-xs text-gray-500">{fmtDateTime(d.createdAt)}</td>
                  <td className="py-2">
                    {d.status === "failed" && d.endpointUrl && (
                      <form action={resendDeliveryAction.bind(null, d.id)}>
                        <button
                          type="submit"
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          {t("admin.webhooks.resend")}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SecretRow({ secret }: { secret: string }) {
  const t = useTranslator();
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
      <span>{t("admin.webhooks.secretLabel")}</span>
      <code className="break-all rounded bg-gray-100 px-2 py-1 font-mono">
        {shown ? secret || "—" : "••••••••••••"}
      </code>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="rounded border px-2 py-0.5 hover:bg-gray-50"
      >
        {shown ? t("admin.webhooks.hideSecret") : t("admin.webhooks.revealSecret")}
      </button>
    </div>
  );
}
