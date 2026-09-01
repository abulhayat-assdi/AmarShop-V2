"use client";

import { useActionState, useRef } from "react";
import { useTranslator } from "@/components/i18n-provider";
import {
  MEDIA_ACCEPT_ATTR,
  MAX_MEDIA_DOC_MB_LABEL,
  MAX_MEDIA_IMAGE_MB_LABEL,
} from "@/lib/media/constants";
import { uploadMediaAction, type MediaState } from "./actions";

const initialState: MediaState = {};

export function MediaUploadForm({
  folders,
  defaultFolderId,
}: {
  folders: { id: string; name: string }[];
  defaultFolderId: string;
}) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(uploadMediaAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        formAction(fd);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4"
    >
      <h2 className="font-medium">{t("admin.media.uploadTitle")}</h2>

      <input
        type="file"
        name="files"
        multiple
        accept={MEDIA_ACCEPT_ATTR}
        required
        className="text-sm"
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-gray-600">{t("admin.media.moveToFolder")}</span>
          <select
            name="folderId"
            defaultValue={defaultFolderId}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="">{t("admin.media.rootLabel")}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-black px-4 py-1.5 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("admin.media.uploading") : t("admin.media.uploadButton")}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {t("admin.media.uploadHint", {
          img: MAX_MEDIA_IMAGE_MB_LABEL,
          doc: MAX_MEDIA_DOC_MB_LABEL,
        })}
      </p>

      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.media.uploaded", { n: state.count ?? 0 })}
        </p>
      )}
    </form>
  );
}
