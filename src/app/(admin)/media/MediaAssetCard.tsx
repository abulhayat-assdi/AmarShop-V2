"use client";

import { useState, useTransition } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { MediaAssetRef } from "@/lib/media/assets";
import { deleteMediaAssetAction, updateMediaAssetAction } from "./actions";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaAssetCard({
  asset,
  folders,
}: {
  asset: MediaAssetRef;
  folders: { id: string; name: string }[];
}) {
  const t = useTranslator();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alt, setAlt] = useState(asset.alt ?? "");

  const copyLink = async () => {
    try {
      const absolute = new URL(asset.url, window.location.origin).href;
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const saveAlt = () => {
    if ((asset.alt ?? "") === alt.trim()) return;
    startTransition(() => updateMediaAssetAction(asset.id, { altText: alt }));
  };

  const moveFolder = (folderId: string) => {
    startTransition(() => updateMediaAssetAction(asset.id, { folderId: folderId || null }));
  };

  return (
    <div className="flex flex-col gap-2 rounded border border-gray-200 p-2 text-sm">
      <div className="flex h-32 items-center justify-center overflow-hidden rounded bg-gray-50">
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- storefront-served upload, not a Next-optimizable static asset
          <img src={asset.url} alt={asset.alt ?? ""} className="h-full w-full object-contain" />
        ) : (
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-black"
          >
            <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">PDF</span>
            <span className="text-xs underline">{t("admin.media.open")}</span>
          </a>
        )}
      </div>

      <p className="truncate font-medium" title={asset.fileName}>
        {asset.fileName}
      </p>
      <p className="text-xs text-gray-500">
        {formatBytes(asset.sizeBytes)}
        {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button type="button" onClick={copyLink} className="underline">
          {copied ? t("admin.media.copied") : t("admin.media.copyLink")}
        </button>
        <a href={asset.url} target="_blank" rel="noreferrer" className="underline">
          {t("admin.media.open")}
        </a>
      </div>

      {asset.kind === "image" && (
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {t("admin.media.altLabel")}
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={saveAlt}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
      )}

      {folders.length > 0 && (
        <select
          value={asset.folderId ?? ""}
          onChange={(e) => moveFolder(e.target.value)}
          disabled={isPending}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="">{t("admin.media.rootLabel")}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}

      {confirming ? (
        <span className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">{t("admin.media.deleteQ")}</span>
          <button
            type="button"
            onClick={() => startTransition(() => deleteMediaAssetAction(asset.id))}
            className="text-red-600 underline"
          >
            {t("admin.common.delete")}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="underline">
            {t("admin.common.cancel")}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start text-xs text-red-600 underline"
        >
          {t("admin.common.delete")}
        </button>
      )}
    </div>
  );
}
