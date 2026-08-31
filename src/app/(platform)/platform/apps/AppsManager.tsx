"use client";

import { Fragment, useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { API_SCOPES, SCOPE_LABEL_KEYS, type ApiScope } from "@/lib/api/scopes";
import type { OAuthAppListItem } from "@/lib/oauth/apps";
import {
  createAppAction,
  regenerateSecretAction,
  removeAppLogoAction,
  setAppStatusAction,
  updateAppAction,
  type AppFormState,
} from "./actions";

const EMPTY: AppFormState = {};

function SecretBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-green-500 bg-green-50 p-3 text-sm">
      <p className="font-semibold text-green-800">{title}</p>
      <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs">
        {value}
      </code>
    </div>
  );
}

function AppFields({
  app,
}: {
  app?: OAuthAppListItem;
}) {
  const t = useTranslator();
  const inputCls = "rounded border border-gray-300 px-3 py-2";
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.apps.nameLabel")}
        <input name="name" type="text" defaultValue={app?.name ?? ""} className={inputCls} />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          {t("platform.apps.developerNameLabel")}
          <input
            name="developerName"
            type="text"
            defaultValue={app?.developerName ?? ""}
            className={inputCls}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          {t("platform.apps.developerEmailLabel")}
          <input
            name="developerEmail"
            type="email"
            defaultValue={app?.developerEmail ?? ""}
            className={inputCls}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.apps.homepageLabel")}
        <input
          name="homepageUrl"
          type="url"
          defaultValue={app?.homepageUrl ?? ""}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.apps.descriptionLabel")}
        <input
          name="description"
          type="text"
          defaultValue={app?.description ?? ""}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t("platform.apps.redirectUrisLabel")}
        <textarea
          name="redirectUris"
          rows={3}
          defaultValue={app?.redirectUris.join("\n") ?? ""}
          className={`${inputCls} font-mono text-xs`}
        />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <span>{t("platform.apps.logoLabel")}</span>
        <div className="flex items-center gap-3">
          {app?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.logoUrl}
              alt=""
              className="h-10 w-10 rounded border border-gray-200 object-cover"
            />
          )}
          <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        </div>
        <span className="text-xs text-gray-500">{t("platform.apps.logoHint")}</span>
        {app?.logoUrl && (
          <button
            type="button"
            onClick={() => removeAppLogoAction(app.id)}
            className="self-start text-xs text-red-600 underline"
          >
            {t("platform.apps.removeLogo")}
          </button>
        )}
      </div>
      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="font-medium">{t("platform.apps.scopesLabel")}</legend>
        {API_SCOPES.map((s: ApiScope) => (
          <label key={s} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="scopes"
              value={s}
              defaultChecked={app ? app.scopes.includes(s) : true}
            />
            <span>
              {t(SCOPE_LABEL_KEYS[s])} <span className="font-mono text-xs text-gray-500">{s}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

function CreateForm() {
  const t = useTranslator();
  const [state, action, pending] = useActionState(createAppAction, EMPTY);
  return (
    <form action={action} className="flex flex-col gap-3 rounded border p-4">
      <span className="text-sm font-semibold">{t("platform.apps.createTitle")}</span>
      <AppFields />
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? t("platform.apps.creating") : t("platform.apps.create")}
      </button>
      {state.created && (
        <div className="flex flex-col gap-2">
          <SecretBox title={t("platform.apps.clientIdLabel")} value={state.created.clientId} />
          <SecretBox title={t("platform.apps.secretOnceTitle")} value={state.created.secret} />
        </div>
      )}
    </form>
  );
}

function EditForm({ app, onDone }: { app: OAuthAppListItem; onDone: () => void }) {
  const t = useTranslator();
  const [state, action, pending] = useActionState(updateAppAction.bind(null, app.id), EMPTY);
  return (
    <form action={action} className="flex flex-col gap-3 rounded border border-gray-300 bg-gray-50 p-4">
      <span className="text-sm font-semibold">{t("platform.apps.editTitle")}</span>
      <AppFields app={app} />
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && <p className="text-sm text-green-700">✓</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? t("platform.apps.saving") : t("platform.apps.save")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
        >
          {t("platform.apps.cancel")}
        </button>
      </div>
    </form>
  );
}

function RegenerateForm({ appId }: { appId: string }) {
  const t = useTranslator();
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async () => {
        setPending(true);
        try {
          const res = await regenerateSecretAction(appId);
          setSecret(res.secret ?? null);
        } finally {
          setPending(false);
        }
      }}
      className="flex flex-col gap-2"
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
      >
        {t("platform.apps.regenerate")}
      </button>
      {secret && <SecretBox title={t("platform.apps.newSecretTitle")} value={secret} />}
    </form>
  );
}

export function AppsManager({ apps }: { apps: OAuthAppListItem[] }) {
  const t = useTranslator();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <CreateForm />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("platform.apps.colApp")}</th>
            <th className="py-2">{t("platform.apps.colDeveloper")}</th>
            <th className="py-2">{t("platform.apps.colClientId")}</th>
            <th className="py-2">{t("platform.apps.colScopes")}</th>
            <th className="py-2">{t("platform.apps.colInstalls")}</th>
            <th className="py-2">{t("platform.apps.colStatus")}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {apps.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-gray-500">
                {t("platform.apps.none")}
              </td>
            </tr>
          ) : (
            apps.map((a) => (
              <Fragment key={a.id}>
                <tr className="border-b align-top">
                  <td className="py-2">
                    <span className="flex items-start gap-2">
                      {a.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.logoUrl}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded border border-gray-200 object-cover"
                        />
                      )}
                      <span>
                        {a.name}
                        {a.description && (
                          <span className="block text-xs text-gray-500">{a.description}</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-600">
                    {a.developerName}
                    <span className="block text-gray-400">{a.developerEmail}</span>
                  </td>
                  <td className="py-2 font-mono text-xs">{a.clientId}</td>
                  <td className="py-2">
                    <span className="flex flex-wrap gap-1">
                      {a.scopes.map((s) => (
                        <span key={s} className="rounded bg-gray-100 px-1 font-mono text-xs">
                          {s}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-2">{a.installCount}</td>
                  <td className="py-2">
                    {a.status === "active" ? (
                      <span className="text-green-700">{t("platform.apps.statusActive")}</span>
                    ) : (
                      <span className="text-red-600">{t("platform.apps.statusDisabled")}</span>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col items-start gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === a.id ? null : a.id)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                      >
                        {t("platform.apps.edit")}
                      </button>
                      <RegenerateForm appId={a.id} />
                      <form
                        action={setAppStatusAction.bind(
                          null,
                          a.id,
                          a.status === "active" ? "disabled" : "active"
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                        >
                          {a.status === "active"
                            ? t("platform.apps.disable")
                            : t("platform.apps.enable")}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
                {editingId === a.id && (
                  <tr>
                    <td colSpan={7} className="py-2">
                      <EditForm app={a} onDone={() => setEditingId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>
      <p className="text-xs text-gray-500">{t("platform.apps.disableHint")}</p>
    </div>
  );
}
