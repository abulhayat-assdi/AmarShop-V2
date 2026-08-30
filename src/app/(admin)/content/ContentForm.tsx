"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { CONTENT_STATUSES, CONTENT_STATUS_KEYS } from "@/lib/enum-labels";
import type { ContentEntry } from "@/db/schema";
import type { ContentState } from "./actions";

const initialState: ContentState = {};

export type ContentInitialValues = {
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  status: ContentEntry["status"];
  showInFooter: boolean;
  footerOrder: string;
  seoTitle: string;
  seoDescription: string;
};

export function ContentForm({
  kind,
  action,
  submitLabel,
  initialValues,
}: {
  kind: ContentEntry["kind"];
  action: (prev: ContentState, formData: FormData) => Promise<ContentState>;
  submitLabel: string;
  initialValues?: ContentInitialValues;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const t = useTranslator();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? "");
  const [body, setBody] = useState(initialValues?.bodyMarkdown ?? "");
  const [status, setStatus] = useState<ContentEntry["status"]>(initialValues?.status ?? "draft");
  const [showInFooter, setShowInFooter] = useState(initialValues?.showInFooter ?? false);
  const [footerOrder, setFooterOrder] = useState(initialValues?.footerOrder ?? "0");
  const [seoTitle, setSeoTitle] = useState(initialValues?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initialValues?.seoDescription ?? "");

  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.content.fieldTitle")}
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.content.fieldSlug")}
        <input
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={`${field} font-mono`}
        />
        <span className="text-xs text-gray-500">{t("admin.content.fieldSlugHint")}</span>
      </label>

      {kind === "post" && (
        <label className="flex flex-col gap-1">
          {t("admin.content.fieldExcerpt")}
          <textarea
            name="excerpt"
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className={field}
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.content.fieldBody")}
        <textarea
          name="bodyMarkdown"
          rows={16}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${field} font-mono text-sm`}
        />
        <span className="text-xs text-gray-500">{t("admin.content.fieldBodyHint")}</span>
      </label>

      <label className="flex flex-col gap-1">
        {t("admin.content.fieldStatus")}
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ContentEntry["status"])}
          className={field}
        >
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(CONTENT_STATUS_KEYS[s])}
            </option>
          ))}
        </select>
      </label>

      {kind === "page" && (
        <div className="flex flex-col gap-3 rounded border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="showInFooter"
              checked={showInFooter}
              onChange={(e) => setShowInFooter(e.target.checked)}
            />
            {t("admin.content.showInFooter")}
          </label>
          <label className="flex flex-col gap-1">
            {t("admin.content.footerOrder")}
            <input
              name="footerOrder"
              type="number"
              min="0"
              step="1"
              value={footerOrder}
              onChange={(e) => setFooterOrder(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className={field}
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1">
        {t("admin.content.fieldSeoTitle")}
        <input
          name="seoTitle"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1">
        {t("admin.content.fieldSeoDescription")}
        <textarea
          name="seoDescription"
          rows={2}
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : submitLabel}
      </button>
    </form>
  );
}
