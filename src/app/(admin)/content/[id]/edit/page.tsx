import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { contentEntries } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { renderMarkdown } from "@/lib/cms/render";
import { ContentForm } from "../../ContentForm";
import { DeleteContentButton } from "../../DeleteContentButton";
import { updateContent } from "../../actions";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaffSession();
  const { t } = await getTranslator();

  const [entry] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select()
      .from(contentEntries)
      .where(and(eq(contentEntries.storeId, session.user.storeId), eq(contentEntries.id, id)))
      .limit(1)
  );
  if (!entry) notFound();

  const previewHtml = renderMarkdown(entry.bodyMarkdown);
  const storefrontPath = entry.kind === "post" ? `/blog/${entry.slug}` : `/pages/${entry.slug}`;

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex max-w-2xl flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">
            {entry.kind === "page" ? t("admin.content.editPage") : t("admin.content.editPost")}
          </h1>
          {entry.status === "published" && (
            <a
              href={storefrontPath}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap text-sm underline"
            >
              {t("admin.content.viewOnSite")}
            </a>
          )}
        </div>

        <ContentForm
          kind={entry.kind}
          action={updateContent.bind(null, entry.id)}
          submitLabel={t("admin.content.save")}
          initialValues={{
            title: entry.title,
            slug: entry.slug,
            excerpt: entry.excerpt ?? "",
            bodyMarkdown: entry.bodyMarkdown,
            status: entry.status,
            showInFooter: entry.showInFooter,
            footerOrder: String(entry.footerOrder),
            seoTitle: entry.seoTitle ?? "",
            seoDescription: entry.seoDescription ?? "",
          }}
        />

        <DeleteContentButton entryId={entry.id} />
      </div>

      <div className="flex-1">
        <h2 className="mb-2 font-semibold">{t("admin.content.preview")}</h2>
        {entry.bodyMarkdown.trim() ? (
          <div
            className="cms-content rounded border p-4"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <p className="text-sm text-gray-500">{t("admin.content.previewEmpty")}</p>
        )}
      </div>
    </div>
  );
}
