import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { and, eq, inArray, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { productMedia } from "@/db/schema";
import { getStorageAdapter } from "@/lib/storage";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_MEDIA_PER_PRODUCT,
  MAX_VIDEO_BYTES,
  MAX_VIDEOS_PER_PRODUCT,
} from "./media-constants";

const execFileAsync = promisify(execFile);

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

// LocalStorageAdapter.url() -> "/uploads/<key>", served by
// src/app/uploads/[...key]/route.ts. Swapping to R2 changes only
// getStorageAdapter().
export function mediaUrl(storageKey: string): string {
  return getStorageAdapter().url(storageKey);
}

// ---------- optimization ----------

type OptimizedImage = {
  data: Buffer;
  contentType: "image/webp";
  width: number | null;
  height: number | null;
};

// Re-encode to WebP, honour EXIF orientation, cap the long edge at 2048,
// drop metadata. A 4 MB photo does this in well under a second.
export async function optimizeImage(input: Buffer): Promise<OptimizedImage> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    contentType: "image/webp",
    width: info.width ?? null,
    height: info.height ?? null,
  };
}

type RemuxedVideo = {
  data: Buffer;
  contentType: string;
  ext: string;
  durationSeconds: number | null;
};

async function probeDuration(file: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { timeout: 15_000 }
    );
    const seconds = Number(String(stdout).trim());
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  } catch {
    return null;
  }
}

// No re-encode — just a stream copy. For MP4 this also moves the moov atom
// to the front (+faststart) so the browser can start playback before the
// whole file downloads. Real compression is a Phase 3 job-queue task.
// A file ffmpeg can't read (not really a video) makes this throw.
export async function remuxVideo(input: Buffer, mime: string): Promise<RemuxedVideo> {
  const ext = VIDEO_EXT[mime];
  if (!ext) throw new Error(`Unsupported video type: ${mime}`);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "amarshop-vid-"));
  const inFile = path.join(dir, `in.${ext}`);
  const outFile = path.join(dir, `out.${ext}`);
  try {
    await fs.writeFile(inFile, input);

    const args = ["-y", "-i", inFile, "-c", "copy"];
    if (ext === "mp4") args.push("-movflags", "+faststart");
    args.push(outFile);

    await execFileAsync("ffmpeg", args, { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });

    const [data, durationSeconds] = await Promise.all([
      fs.readFile(outFile),
      probeDuration(inFile),
    ]);
    return { data, contentType: mime, ext, durationSeconds };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

// ---------- validation ----------

// A <input type="file" multiple> with nothing chosen still submits one
// zero-byte entry with an empty name — drop those before validating.
function realFiles(files: File[]): File[] {
  return files.filter((f) => f instanceof File && f.size > 0 && f.name !== "");
}

export type MediaValidation =
  | { ok: { images: File[]; videos: File[] } }
  | { error: string };

export function validateMediaFiles(
  rawImages: File[],
  rawVideos: File[],
  existing: { images: number; videos: number } = { images: 0, videos: 0 }
): MediaValidation {
  const images = realFiles(rawImages);
  const videos = realFiles(rawVideos);
  if (images.length === 0 && videos.length === 0) {
    return { ok: { images: [], videos: [] } };
  }

  for (const file of images) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return { error: `"${file.name}" isn't a JPEG, PNG or WebP image.` };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `"${file.name}" is larger than ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.` };
    }
  }
  for (const file of videos) {
    if (!(ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type)) {
      return { error: `"${file.name}" isn't an MP4 or WebM video.` };
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return { error: `"${file.name}" is larger than ${MAX_VIDEO_BYTES / (1024 * 1024)} MB.` };
    }
  }

  if (existing.videos + videos.length > MAX_VIDEOS_PER_PRODUCT) {
    return {
      error: `A product can have at most ${MAX_VIDEOS_PER_PRODUCT} videos (this one already has ${existing.videos}).`,
    };
  }
  const total = existing.images + existing.videos + images.length + videos.length;
  if (total > MAX_MEDIA_PER_PRODUCT) {
    return {
      error: `A product can have at most ${MAX_MEDIA_PER_PRODUCT} photos & videos in total (this one already has ${
        existing.images + existing.videos
      }).`,
    };
  }
  return { ok: { images, videos } };
}

// ---------- storage ----------

export async function storeProductMedia(
  storeId: string,
  productId: string,
  files: { images: File[]; videos: File[] }
): Promise<void> {
  if (files.images.length === 0 && files.videos.length === 0) return;
  const adapter = getStorageAdapter();

  type Pending = {
    kind: "image" | "video";
    key: string;
    contentType: string;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
  };
  const pending: Pending[] = [];

  for (const file of files.images) {
    const out = await optimizeImage(Buffer.from(await file.arrayBuffer()));
    const key = `products/${storeId}/${productId}/${randomUUID()}.webp`;
    await adapter.put(key, out.data, out.contentType);
    pending.push({
      kind: "image",
      key,
      contentType: out.contentType,
      width: out.width,
      height: out.height,
      durationSeconds: null,
    });
  }
  for (const file of files.videos) {
    const out = await remuxVideo(Buffer.from(await file.arrayBuffer()), file.type);
    const key = `products/${storeId}/${productId}/${randomUUID()}.${out.ext}`;
    await adapter.put(key, out.data, out.contentType);
    pending.push({
      kind: "video",
      key,
      contentType: out.contentType,
      width: null,
      height: null,
      durationSeconds: out.durationSeconds,
    });
  }

  await withStoreContext(storeId, async (tx) => {
    const [row] = await tx
      .select({ max: sql<number>`coalesce(max(${productMedia.sortOrder}), 0)` })
      .from(productMedia)
      .where(and(eq(productMedia.storeId, storeId), eq(productMedia.productId, productId)));
    let order = row?.max ?? 0;
    for (const p of pending) {
      order += 1;
      await tx.insert(productMedia).values({
        storeId,
        productId,
        kind: p.kind,
        storageKey: p.key,
        contentType: p.contentType,
        sortOrder: order,
        width: p.width,
        height: p.height,
        durationSeconds: p.durationSeconds,
      });
    }
  });
}

export async function removeProductMedia(
  storeId: string,
  productId: string,
  mediaId: string
): Promise<void> {
  const key = await withStoreContext(storeId, async (tx) => {
    const [row] = await tx
      .select({ storageKey: productMedia.storageKey })
      .from(productMedia)
      .where(
        and(
          eq(productMedia.storeId, storeId),
          eq(productMedia.productId, productId),
          eq(productMedia.id, mediaId)
        )
      )
      .limit(1);
    if (!row) return null;

    await tx
      .delete(productMedia)
      .where(and(eq(productMedia.storeId, storeId), eq(productMedia.id, mediaId)));
    return row.storageKey;
  });

  if (key) {
    try {
      await getStorageAdapter().delete(key);
    } catch {
      // best-effort — the row is already gone, an orphan file is harmless
    }
  }
}

// ---------- reads ----------

export type MediaRef = {
  id: string;
  kind: "image" | "video";
  url: string;
  contentType: string;
  width: number | null;
  height: number | null;
  alt: string | null;
};

export async function getProductMedia(
  storeId: string,
  productId: string
): Promise<MediaRef[]> {
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: productMedia.id,
        kind: productMedia.kind,
        storageKey: productMedia.storageKey,
        contentType: productMedia.contentType,
        width: productMedia.width,
        height: productMedia.height,
        altText: productMedia.altText,
      })
      .from(productMedia)
      .where(and(eq(productMedia.storeId, storeId), eq(productMedia.productId, productId)))
      .orderBy(productMedia.sortOrder)
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    url: mediaUrl(r.storageKey),
    contentType: r.contentType,
    width: r.width,
    height: r.height,
    alt: r.altText,
  }));
}

export async function countProductMedia(
  storeId: string,
  productId: string
): Promise<{ images: number; videos: number }> {
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({ kind: productMedia.kind, n: sql<number>`count(*)::int` })
      .from(productMedia)
      .where(and(eq(productMedia.storeId, storeId), eq(productMedia.productId, productId)))
      .groupBy(productMedia.kind)
  );
  const out = { images: 0, videos: 0 };
  for (const r of rows) {
    if (r.kind === "image") out.images = r.n;
    else out.videos = r.n;
  }
  return out;
}

// Primary (lowest sort_order) IMAGE per product, for listing grids. A
// video-only product returns nothing and renders the placeholder.
export async function getPrimaryImageUrls(
  storeId: string,
  productIds: string[]
): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({
        productId: productMedia.productId,
        storageKey: productMedia.storageKey,
      })
      .from(productMedia)
      .where(
        and(
          eq(productMedia.storeId, storeId),
          eq(productMedia.kind, "image"),
          inArray(productMedia.productId, productIds)
        )
      )
      .orderBy(productMedia.sortOrder)
  );
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (!(r.productId in out)) out[r.productId] = mediaUrl(r.storageKey);
  }
  return out;
}
