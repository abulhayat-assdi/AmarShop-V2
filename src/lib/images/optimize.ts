import sharp from "sharp";

// Shared image re-encoder. Kept in its own module (only `sharp`, no
// drizzle / child_process / storage) so callers that just need to
// normalise one image — product media, OAuth app logos — don't drag the
// video/ffmpeg path or the DB layer into their bundle.

export type OptimizedImage = {
  data: Buffer;
  contentType: "image/webp";
  width: number | null;
  height: number | null;
};

// Re-encode to WebP, honour EXIF orientation, cap the long edge at
// `maxEdge` (default 2048 — a full product photo; pass e.g. 256 for a
// logo), drop metadata. A 4 MB photo does this in well under a second.
export async function optimizeImage(input: Buffer, maxEdge = 2048): Promise<OptimizedImage> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    contentType: "image/webp",
    width: info.width ?? null,
    height: info.height ?? null,
  };
}
