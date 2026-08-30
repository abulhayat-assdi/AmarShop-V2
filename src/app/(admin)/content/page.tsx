import Link from "next/link";
import { requireStaffSession } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { CONTENT_STATUS_KEYS } from "@/lib/enum-labels";
import { listEntriesForAdmin } from "@/lib/cms/queries";
import type { Translator } from "@/lib/i18n/translate";
import type { ContentEntry } from "@/db/schema";
import { DeleteContentButton } from "./DeleteContentButton";

function ContentTable({
  rows,
  kind,
  emptyLabel,
  t,
}: {
  rows: ContentEntry[];
  kind: ContentEntry["kind"];
  emptyLabel: string;
  t: Translator;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b">
          <th className="py-2">{t("admin.content.colTitle")}</th>
          <th className="py-2">{t("admin.content.colSlug")}</th>
          <th className="py-2">{t("admin.content.colStatus")}</th>
          <th className="py-2">
            {kind === "post" ? t("admin.content.colDate") : t("admin.content.colFooter")}
          </th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-4 text-gray-500">
              {emptyLabel}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-2">{row.title}</td>
              <td className="py-2 font-mono text-xs text-gray-500">{row.slug}</td>
              <td className="py-2">{t(CONTENT_STATUS_KEYS[row.status])}</td>
              <td className="py-2 text-xs text-gray-500">
                {kind === "post"
                  ? row.publishedAt
                    ? new Date(row.publishedAt).toLocaleDateString()
                    : "—"
                  : row.showInFooter
                    ? `#${row.footerOrder}`
                    : "—"}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <Link href={`/content/${row.id}/edit`} className="underline">
                    {t("admin.content.edit")}
                  </Link>
                  <DeleteContentButton entryId={row.id} />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default async function ContentPage() {
  const session = await requireStaffSession();
  const { t } = await getTranslator();
  const entries = await listEntriesForAdmin(session.user.storeId);
  const posts = entries.filter((e) => e.kind === "post");
  const pages = entries.filter((e) => e.kind === "page");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{t("admin.content.title")}</h1>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("admin.content.blogSection")}</h2>
          <Link
            href="/content/new"
            className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
          >
            {t("admin.content.addPost")}
          </Link>
        </div>
        <ContentTable rows={posts} kind="post" emptyLabel={t("admin.content.noPosts")} t={t} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("admin.content.pagesSection")}</h2>
          <Link
            href="/content/new?kind=page"
            className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
          >
            {t("admin.content.addPage")}
          </Link>
        </div>
        <ContentTable rows={pages} kind="page" emptyLabel={t("admin.content.noPages")} t={t} />
      </section>
    </div>
  );
}
