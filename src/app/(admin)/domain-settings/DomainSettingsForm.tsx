"use client";

import { useActionState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { DnsRecord, DnsSetup } from "@/lib/tenant/custom-domain";
import {
  removeDomainAction,
  saveDomainAction,
  verifyDomainAction,
  type DomainActionState,
} from "./actions";

const initial: DomainActionState = {};

function RecordTable({ rows, colType, colName, colValue }: {
  rows: DnsRecord[];
  colType: string;
  colName: string;
  colValue: string;
}) {
  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b text-gray-500">
          <th className="py-1 pr-3 font-medium">{colType}</th>
          <th className="py-1 pr-3 font-medium">{colName}</th>
          <th className="py-1 font-medium">{colValue}</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {rows.map((r) => (
          <tr key={`${r.type}-${r.name}`} className="border-b last:border-0">
            <td className="py-1 pr-3">{r.type}</td>
            <td className="py-1 pr-3">{r.name}</td>
            <td className="py-1">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DomainSettingsForm({
  customDomain,
  verified,
  dnsSetup,
}: {
  customDomain: string | null;
  verified: boolean;
  dnsSetup: DnsSetup | null;
}) {
  const t = useTranslator();
  const [saveState, saveAction, saving] = useActionState(saveDomainAction, initial);
  const [verifyState, verifyAct, verifying] = useActionState(verifyDomainAction, initial);
  const [removeState, removeAct, removing] = useActionState(removeDomainAction, initial);

  const statusLabel = !customDomain
    ? t("admin.domain.statusNone")
    : verified
      ? t("admin.domain.statusLive")
      : t("admin.domain.statusPending");
  const statusClass = verified
    ? "bg-green-100 text-green-800"
    : customDomain
      ? "bg-amber-100 text-amber-800"
      : "bg-gray-100 text-gray-600";

  const rootBlock = dnsSetup && dnsSetup.rootRecords.length > 0 && (
    <div key="root">
      <div className="mb-1 font-semibold">{t("admin.domain.dnsRoot")}</div>
      <RecordTable
        rows={dnsSetup.rootRecords}
        colType={t("admin.domain.dnsColType")}
        colName={t("admin.domain.dnsColName")}
        colValue={t("admin.domain.dnsColValue")}
      />
    </div>
  );
  const subBlock = dnsSetup?.subdomainRecord && (
    <div key="sub">
      <div className="mb-1 font-semibold">{t("admin.domain.dnsSub")}</div>
      <RecordTable
        rows={[dnsSetup.subdomainRecord]}
        colType={t("admin.domain.dnsColType")}
        colName={t("admin.domain.dnsColName")}
        colValue={t("admin.domain.dnsColValue")}
      />
    </div>
  );
  const blocks = dnsSetup?.likelyApex ? [rootBlock, subBlock] : [subBlock, rootBlock];

  return (
    <div className="flex flex-col gap-5">
      <div className="text-sm">
        {t("admin.domain.customDomain")}: <span className="font-mono">{customDomain ?? "—"}</span>
        <span className={`ml-2 rounded px-2 py-0.5 text-xs ${statusClass}`}>{statusLabel}</span>
      </div>

      <form action={saveAction} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.domain.domainLabel")}
          <input
            type="text"
            name="domain"
            defaultValue={customDomain ?? ""}
            placeholder={t("admin.domain.domainPlaceholder")}
            autoComplete="off"
            className="rounded border border-gray-300 px-3 py-2 font-mono"
          />
        </label>
        {saveState.error && <p className="text-sm text-red-700">{saveState.error}</p>}
        {saveState.ok && <p className="text-sm text-green-700">{t("admin.domain.saved")}</p>}
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? t("admin.common.saving") : t("admin.domain.save")}
        </button>
      </form>

      {customDomain && !verified && dnsSetup && (
        <div className="flex flex-col gap-3 rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="font-semibold">{t("admin.domain.dnsHeading")}</div>
          {blocks}
          {dnsSetup.likelyApex && dnsSetup.rootRecords.length === 0 && (
            <p className="text-xs text-gray-600">{t("admin.domain.ipPending")}</p>
          )}
          <p className="text-xs text-gray-600">{t("admin.domain.dnsWwwNote")}</p>
          <p className="text-xs text-gray-600">{t("admin.domain.dnsCloudflare")}</p>
          <p className="text-xs text-gray-600">{t("admin.domain.dnsPropagation")}</p>
          <form action={verifyAct}>
            {verifyState.error && (
              <p className="mb-2 text-sm text-red-700">
                {t("admin.domain.verifyFailed", { detail: verifyState.error })}
              </p>
            )}
            <button
              type="submit"
              disabled={verifying}
              className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {verifying ? t("admin.common.saving") : t("admin.domain.verifyNow")}
            </button>
          </form>
        </div>
      )}

      {verified && <p className="text-sm text-green-700">{t("admin.domain.verified")}</p>}

      {customDomain && (
        <form action={removeAct}>
          {removeState.error && <p className="mb-2 text-sm text-red-700">{removeState.error}</p>}
          <button
            type="submit"
            disabled={removing}
            className="text-sm text-red-700 underline disabled:opacity-50"
          >
            {t("admin.domain.remove")}
          </button>
        </form>
      )}
    </div>
  );
}
