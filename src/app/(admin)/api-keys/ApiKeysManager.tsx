"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { API_SCOPES, SCOPE_LABEL_KEYS } from "@/lib/api/scopes";
import type { ApiKeyListItem } from "@/lib/api/keys";
import { createApiKeyAction, revokeApiKeyAction, type ApiKeyCreateState } from "./actions";

const initial: ApiKeyCreateState = {};

function fmtDate(d: Date | string | null): string {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export function ApiKeysManager({ keys }: { keys: ApiKeyListItem[] }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(createApiKeyAction, initial);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
        <span className="text-sm font-semibold">{t("admin.apiKeys.createTitle")}</span>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.apiKeys.nameLabel")}
          <input
            type="text"
            name="name"
            autoComplete="off"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="font-medium">{t("admin.apiKeys.scopesLabel")}</legend>
          {API_SCOPES.map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input type="checkbox" name="scopes" value={s} defaultChecked />
              <span>
                {t(SCOPE_LABEL_KEYS[s])} <span className="font-mono text-xs text-gray-500">{s}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {state.error && (
          <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
            {t(state.error)}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("admin.apiKeys.creating") : t("admin.apiKeys.create")}
        </button>

        {state.created && (
          <div className="rounded border border-green-500 bg-green-50 p-3 text-sm">
            <p className="font-semibold text-green-800">{t("admin.apiKeys.tokenOnceTitle")}</p>
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs">
              {state.created.token}
            </code>
            <p className="mt-1 text-xs text-green-800">{t("admin.apiKeys.tokenOnceWarning")}</p>
          </div>
        )}
      </form>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.apiKeys.colName")}</th>
            <th className="py-2">{t("admin.apiKeys.colPrefix")}</th>
            <th className="py-2">{t("admin.apiKeys.colScopes")}</th>
            <th className="py-2">{t("admin.apiKeys.colLastUsed")}</th>
            <th className="py-2">{t("admin.apiKeys.colCreated")}</th>
            <th className="py-2">{t("admin.apiKeys.colStatus")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {keys.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-gray-500">
                {t("admin.apiKeys.none")}
              </td>
            </tr>
          ) : (
            keys.map((k) => (
              <tr key={k.id} className="border-b align-top">
                <td className="py-2">{k.name}</td>
                <td className="py-2 font-mono text-xs">{k.tokenPrefix}…</td>
                <td className="py-2">
                  <span className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="rounded bg-gray-100 px-1 text-xs font-mono">
                        {s}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="py-2 text-xs text-gray-500">{fmtDate(k.lastUsedAt)}</td>
                <td className="py-2 text-xs text-gray-500">{fmtDate(k.createdAt)}</td>
                <td className="py-2">
                  {k.revokedAt ? (
                    <span className="text-gray-400">{t("admin.apiKeys.statusRevoked")}</span>
                  ) : (
                    <span className="text-green-700">{t("admin.apiKeys.statusActive")}</span>
                  )}
                </td>
                <td className="py-2">
                  {!k.revokedAt && (
                    <form action={revokeApiKeyAction.bind(null, k.id)}>
                      <button
                        type="submit"
                        className="rounded border border-red-400 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        {t("admin.apiKeys.revoke")}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
