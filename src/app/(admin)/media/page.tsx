import Link from "next/link";
import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { listMediaFolders } from "@/lib/media/folders";
import { listMediaAssets, type MediaAssetKind } from "@/lib/media/assets";
import { MediaUploadForm } from "./MediaUploadForm";
import { MediaAssetCard } from "./MediaAssetCard";
import { FolderManager } from "./FolderManager";

type Filter = "all" | "images" | "documents" | "folders";
const FILTERS: Filter[] = ["all", "images", "documents", "folders"];
const FILTER_LABEL_KEY: Record<Filter, string> = {
  all: "admin.media.filterAll",
  images: "admin.media.filterImages",
  documents: "admin.media.filterDocuments",
  folders: "admin.media.filterFolders",
};
const KIND_FOR: Partial<Record<Filter, MediaAssetKind>> = {
  images: "image",
  documents: "document",
};

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; folder?: string }>;
}) {
  const session = await requirePermission("content:manage");
  const { t } = await getTranslator();
  const sp = await searchParams;

  const filter: Filter = FILTERS.includes(sp.filter as Filter) ? (sp.filter as Filter) : "all";
  const folders = await listMediaFolders(session.user.storeId);
  const activeFolderId =
    sp.folder && folders.some((f) => f.id === sp.folder) ? sp.folder : null;

  const tabHref = (f: Filter) => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("filter", f);
    if (activeFolderId && f !== "folders") params.set("folder", activeFolderId);
    const qs = params.toString();
    return qs ? `/media?${qs}` : "/media";
  };

  const folderHref = (folderId: string | null) => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (folderId) params.set("folder", folderId);
    const qs = params.toString();
    return qs ? `/media?${qs}` : "/media";
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("admin.media.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">{t("admin.media.intro")}</p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={tabHref(f)}
            className={`-mb-px border-b-2 px-3 py-2 ${
              filter === f
                ? "border-black font-medium text-black"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {t(FILTER_LABEL_KEY[f])}
          </Link>
        ))}
      </nav>

      {filter === "folders" ? (
        <FolderManager folders={folders} />
      ) : (
        <>
          {folders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href={folderHref(null)}
                className={`rounded-full border px-3 py-1 ${
                  activeFolderId === null
                    ? "border-black bg-black text-white"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {t("admin.media.folderAll")}
              </Link>
              {folders.map((folder) => (
                <Link
                  key={folder.id}
                  href={folderHref(folder.id)}
                  className={`rounded-full border px-3 py-1 ${
                    activeFolderId === folder.id
                      ? "border-black bg-black text-white"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {folder.name}{" "}
                  <span className={activeFolderId === folder.id ? "text-gray-300" : "text-gray-400"}>
                    {folder.assetCount}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <MediaUploadForm folders={folders} defaultFolderId={activeFolderId ?? ""} />

          <MediaGrid
            storeId={session.user.storeId}
            kind={KIND_FOR[filter]}
            folderId={activeFolderId}
            folders={folders}
            emptyLabel={t(
              filter === "images"
                ? "admin.media.emptyImages"
                : filter === "documents"
                  ? "admin.media.emptyDocuments"
                  : "admin.media.empty"
            )}
          />
        </>
      )}
    </div>
  );
}

async function MediaGrid({
  storeId,
  kind,
  folderId,
  folders,
  emptyLabel,
}: {
  storeId: string;
  kind: MediaAssetKind | undefined;
  folderId: string | null;
  folders: { id: string; name: string }[];
  emptyLabel: string;
}) {
  const assets = await listMediaAssets(storeId, { kind, folderId: folderId ?? undefined });

  if (assets.length === 0) {
    return <p className="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-500">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {assets.map((asset) => (
        <MediaAssetCard key={asset.id} asset={asset} folders={folders} />
      ))}
    </div>
  );
}
