import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { mediaAssets, mediaFolders } from "@/db/schema";
import { getStorageAdapter } from "@/lib/storage";
import { optimizeImage } from "@/lib/images/optimize";
import {
  MAX_MEDIA_DOC_BYTES,
  MAX_MEDIA_IMAGE_BYTES,
  MAX_MEDIA_UPLOAD_BATCH,
  MEDIA_DOC_TYPES,
  MEDIA_IMAGE_TYPES,
} from "./constants";

const PDF_MAGIC = "%PDF-";

export type MediaAssetKind = "image" | "document";

type PendingEntry = { kind: MediaAssetKind; file: File; buf: Buffer };

export type MediaUploadValidation =
  | { ok: PendingEntry[] }
  | { error: string };

// A <input type="file" multiple> with nothing chosen still submits one
// zero-byte, nameless entry — drop those first.
function realFiles(files: File[]): File[] {
  return files.filter((f) => f instanceof File && f.size > 0 && f.name !== "");
}

// Validate type + size for every file, and confirm a "document" really is
// a PDF by its leading magic bytes (a renamed non-PDF is rejected). Reads
// each file into a Buffer once, reused by storeMediaAssets().
export async function validateMediaUpload(raw: File[]): Promise<MediaUploadValidation> {
  const files = realFiles(raw);
  if (files.length === 0) return { error: "admin.media.errNoFiles" };
  if (files.length > MAX_MEDIA_UPLOAD_BATCH) return { error: "admin.media.errTooMany" };

  const out: PendingEntry[] = [];
  for (const file of files) {
    const isImage = (MEDIA_IMAGE_TYPES as readonly string[]).includes(file.type);
    const isDoc =
      (MEDIA_DOC_TYPES as readonly string[]).includes(file.type) ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isDoc) return { error: "admin.media.errType" };
    if (isImage && file.size > MAX_MEDIA_IMAGE_BYTES) return { error: "admin.media.errImageSize" };
    if (isDoc && file.size > MAX_MEDIA_DOC_BYTES) return { error: "admin.media.errDocSize" };

    const buf = Buffer.from(await file.arrayBuffer());
    if (isImage) {
      out.push({ kind: "image", file, buf });
    } else {
      if (!buf.subarray(0, 5).toString("latin1").startsWith(PDF_MAGIC)) {
        return { error: "admin.media.errPdfInvalid" };
      }
      out.push({ kind: "document", file, buf });
    }
  }
  return { ok: out };
}

// Optimize images to WebP, store every file via the storage adapter at
// media/<storeId>/<uuid>.<ext>, insert one media_assets row each. Call
// validateMediaUpload() first. `folderId` is validated against the store's
// own folders and dropped to null if it doesn't belong here.
export async function storeMediaAssets(
  storeId: string,
  folderId: string | null,
  entries: PendingEntry[]
): Promise<number> {
  if (entries.length === 0) return 0;
  const adapter = getStorageAdapter();

  const safeFolderId = await resolveFolderId(storeId, folderId);

  type Pending = {
    kind: MediaAssetKind;
    storageKey: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  };
  const rows: Pending[] = [];

  for (const entry of entries) {
    if (entry.kind === "image") {
      const opt = await optimizeImage(entry.buf);
      const key = `media/${storeId}/${randomUUID()}.webp`;
      await adapter.put(key, opt.data, opt.contentType);
      rows.push({
        kind: "image",
        storageKey: key,
        fileName: entry.file.name,
        contentType: opt.contentType,
        sizeBytes: opt.data.length,
        width: opt.width,
        height: opt.height,
      });
    } else {
      const key = `media/${storeId}/${randomUUID()}.pdf`;
      await adapter.put(key, entry.buf, "application/pdf");
      rows.push({
        kind: "document",
        storageKey: key,
        fileName: entry.file.name,
        contentType: "application/pdf",
        sizeBytes: entry.buf.length,
        width: null,
        height: null,
      });
    }
  }

  await withStoreContext(storeId, (tx) =>
    tx.insert(mediaAssets).values(rows.map((r) => ({ storeId, folderId: safeFolderId, ...r })))
  );
  return rows.length;
}

async function resolveFolderId(storeId: string, folderId: string | null): Promise<string | null> {
  if (!folderId) return null;
  return withStoreContext(storeId, async (tx) => {
    const [row] = await tx
      .select({ id: mediaFolders.id })
      .from(mediaFolders)
      .where(and(eq(mediaFolders.id, folderId), eq(mediaFolders.storeId, storeId)))
      .limit(1);
    return row?.id ?? null;
  });
}

export type MediaAssetRef = {
  id: string;
  kind: MediaAssetKind;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  folderId: string | null;
  createdAt: Date;
};

export function mediaAssetUrl(storageKey: string): string {
  return getStorageAdapter().url(storageKey);
}

export async function listMediaAssets(
  storeId: string,
  filter: { kind?: MediaAssetKind; folderId?: string | null } = {}
): Promise<MediaAssetRef[]> {
  const conditions = [eq(mediaAssets.storeId, storeId)];
  if (filter.kind) conditions.push(eq(mediaAssets.kind, filter.kind));
  if (filter.folderId) conditions.push(eq(mediaAssets.folderId, filter.folderId));

  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: mediaAssets.id,
        kind: mediaAssets.kind,
        storageKey: mediaAssets.storageKey,
        fileName: mediaAssets.fileName,
        contentType: mediaAssets.contentType,
        sizeBytes: mediaAssets.sizeBytes,
        width: mediaAssets.width,
        height: mediaAssets.height,
        altText: mediaAssets.altText,
        folderId: mediaAssets.folderId,
        createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .where(and(...conditions))
      .orderBy(desc(mediaAssets.createdAt))
  );

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    url: mediaAssetUrl(r.storageKey),
    fileName: r.fileName,
    contentType: r.contentType,
    sizeBytes: r.sizeBytes,
    width: r.width,
    height: r.height,
    alt: r.altText,
    folderId: r.folderId,
    createdAt: r.createdAt,
  }));
}

// Partial update — pass only what changes. `folderId` is passed
// explicitly (string to move into a folder, null to move to the root)
// and validated against the store's own folders.
export async function updateMediaAsset(
  storeId: string,
  assetId: string,
  patch: { altText?: string | null; folderId?: string | null }
): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if ("altText" in patch) set.altText = patch.altText?.trim() ? patch.altText.trim() : null;
  if ("folderId" in patch) set.folderId = await resolveFolderId(storeId, patch.folderId ?? null);
  if (Object.keys(set).length === 1) return; // only updatedAt — nothing to do

  await withStoreContext(storeId, (tx) =>
    tx
      .update(mediaAssets)
      .set(set)
      .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.storeId, storeId)))
  );
}

export async function deleteMediaAsset(storeId: string, assetId: string): Promise<void> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .delete(mediaAssets)
      .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.storeId, storeId)))
      .returning({ storageKey: mediaAssets.storageKey })
  );
  if (row) {
    try {
      await getStorageAdapter().delete(row.storageKey);
    } catch (err) {
      console.error("[media] file delete failed", err);
    }
  }
}
