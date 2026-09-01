"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslator } from "@/components/i18n-provider";
import type { MediaFolderRow } from "@/lib/media/folders";
import {
  createFolderAction,
  deleteFolderAction,
  renameFolderAction,
  type MediaState,
} from "./actions";

const initialState: MediaState = {};

export function FolderManager({ folders }: { folders: MediaFolderRow[] }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(createFolderAction, initialState);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 p-4">
        <h2 className="font-medium">{t("admin.media.newFolder")}</h2>
        <div className="flex gap-2">
          <input
            name="name"
            required
            maxLength={60}
            placeholder={t("admin.media.folderNamePlaceholder")}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {t("admin.media.createFolder")}
          </button>
        </div>
        {state.error && <p className="text-xs text-red-700">{t(state.error)}</p>}
      </form>

      {folders.length === 0 ? (
        <p className="text-sm text-gray-500">{t("admin.media.noFolders")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {folders.map((folder) => (
            <FolderRow key={folder.id} folder={folder} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FolderRow({ folder }: { folder: MediaFolderRow }) {
  const t = useTranslator();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    renameFolderAction.bind(null, folder.id),
    initialState
  );

  return (
    <li className="flex flex-wrap items-center gap-3 rounded border px-3 py-2 text-sm">
      {editing ? (
        <form
          action={(fd) => {
            formAction(fd);
            setEditing(false);
          }}
          className="flex flex-1 items-center gap-2"
        >
          <input
            name="name"
            defaultValue={folder.name}
            maxLength={60}
            className="flex-1 rounded border border-gray-300 px-2 py-1"
          />
          <button type="submit" className="underline">
            {t("admin.common.save")}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="underline">
            {t("admin.common.cancel")}
          </button>
        </form>
      ) : (
        <>
          <span className="flex-1 font-medium">{folder.name}</span>
          <span className="text-xs text-gray-500">
            {t("admin.media.folderCount", { n: folder.assetCount })}
          </span>
          <button type="button" onClick={() => setEditing(true)} className="underline">
            {t("admin.common.edit")}
          </button>
          {confirming ? (
            <span className="flex items-center gap-2">
              <span className="text-gray-600">{t("admin.media.deleteFolderQ")}</span>
              <button
                type="button"
                onClick={() => startTransition(() => deleteFolderAction(folder.id))}
                disabled={isPending}
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
              className="text-red-600 underline"
            >
              {t("admin.common.delete")}
            </button>
          )}
        </>
      )}
      {state.error && <p className="w-full text-xs text-red-700">{t(state.error)}</p>}
    </li>
  );
}
