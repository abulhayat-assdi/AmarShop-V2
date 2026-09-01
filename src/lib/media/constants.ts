// Client-safe: the numeric/type limits for Media Library uploads, shared
// by the server-only validator (src/lib/media/assets.ts) and the upload
// form's hint text so every figure lives in exactly one place (rule #4).
// Zero server-only imports.

export const MEDIA_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MEDIA_DOC_TYPES = ["application/pdf"] as const;

export const MAX_MEDIA_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MiB per image
export const MAX_MEDIA_DOC_BYTES = 25 * 1024 * 1024; // 25 MiB per document

// Files accepted in one upload request. Next buffers the whole multipart
// body in memory (next.config.ts bodySizeLimit); 20 × 25 MB is the
// configured worst case, well under the 120 MB cap.
export const MAX_MEDIA_UPLOAD_BATCH = 20;

export const MEDIA_ACCEPT_ATTR = [...MEDIA_IMAGE_TYPES, ...MEDIA_DOC_TYPES].join(",");

const mib = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

export const MAX_MEDIA_IMAGE_MB_LABEL = mib(MAX_MEDIA_IMAGE_BYTES);
export const MAX_MEDIA_DOC_MB_LABEL = mib(MAX_MEDIA_DOC_BYTES);
