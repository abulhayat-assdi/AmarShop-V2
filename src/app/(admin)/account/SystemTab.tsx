"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import {
  requestStoreDeletionAction,
  toggleMaintenanceModeAction,
  type AccountState,
} from "./store-settings-actions";

const initialState: AccountState = {};

export function SystemTab({
  appVersion,
  storeName,
  maintenanceMode,
  isOwner,
  deletionRequestedAt,
}: {
  appVersion: string;
  storeName: string;
  maintenanceMode: boolean;
  isOwner: boolean;
  deletionRequestedAt: Date | null;
}) {
  const t = useTranslator();
  const [maintState, maintAction, maintPending] = useActionState(
    toggleMaintenanceModeAction,
    initialState
  );
  const [checked, setChecked] = useState(maintenanceMode);

  const [delState, delAction, delPending] = useActionState(
    requestStoreDeletionAction,
    initialState
  );
  const [confirmName, setConfirmName] = useState("");

  return (
    <div className="flex max-w-md flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{t("admin.account.system.version")}</h2>
        <p className="text-sm text-gray-600">AmarShop v{appVersion}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{t("admin.account.system.backup")}</h2>
        <p className="text-sm text-gray-600">{t("admin.account.system.backupInfo")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{t("admin.account.system.dataExport")}</h2>
        <p className="text-sm text-gray-600">{t("admin.account.system.dataExportIntro")}</p>
        <a
          href="/account/export/products"
          className="self-start rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          {t("admin.account.system.exportProducts")}
        </a>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{t("admin.account.system.maintenance")}</h2>
        <p className="text-sm text-gray-600">{t("admin.account.system.maintenanceHint")}</p>
        <form action={maintAction} className="flex flex-col gap-2">
          {maintState.ok && (
            <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
              {t("admin.account.saved")}
            </p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="maintenanceMode"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            {t("admin.account.system.maintenanceLabel")}
          </label>
          <button
            type="submit"
            disabled={maintPending}
            className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {maintPending ? t("admin.common.saving") : t("admin.common.save")}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2 rounded border border-red-300 p-4">
        <h2 className="font-medium text-red-700">{t("admin.account.system.dangerZone")}</h2>
        {deletionRequestedAt ? (
          <p className="text-sm text-red-700">
            {t("admin.account.system.deletionPending", {
              date: deletionRequestedAt.toLocaleDateString(),
            })}
          </p>
        ) : isOwner ? (
          <form action={delAction} className="flex flex-col gap-2">
            {delState.error && (
              <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
                {t(delState.error)}
              </p>
            )}
            {delState.ok && (
              <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
                {t("admin.account.system.deletionRequested")}
              </p>
            )}
            <p className="text-sm text-gray-600">
              {t("admin.account.system.deleteIntro")}
            </p>
            <label className="flex flex-col gap-1 text-sm">
              {t("admin.account.system.confirmNameLabel", { name: storeName })}
              <input
                name="confirmName"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={delPending || confirmName !== storeName}
              className="self-start rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {delPending ? t("admin.common.saving") : t("admin.account.system.requestDeletion")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">{t("admin.account.system.errOwnerOnly")}</p>
        )}
      </section>
    </div>
  );
}
