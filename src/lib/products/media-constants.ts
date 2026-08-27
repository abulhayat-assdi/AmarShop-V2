// Shared by the client-side ProductForm (helper text) and the server-side
// upload/validation helper. Zero server-only imports so the client bundle
// can pull it in without dragging fs/sharp/drizzle along.
//
// HEIC / MOV are intentionally not accepted — Alpine's prebuilt sharp has
// no HEIC decode, and .mov often isn't web-streamable. Merchants convert
// to JPEG/PNG/WebP and MP4/WebM. Broader input support is a later slice.

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MiB per photo
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MiB per video

export const MAX_VIDEOS_PER_PRODUCT = 2;
export const MAX_MEDIA_PER_PRODUCT = 7; // images + videos combined

const mib = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

export const MEDIA_UPLOAD_HINT =
  `Up to ${MAX_MEDIA_PER_PRODUCT} photos & videos total (max ${MAX_VIDEOS_PER_PRODUCT} videos). ` +
  `Photos: JPEG/PNG/WebP up to ${mib(MAX_IMAGE_BYTES)}. ` +
  `Videos: MP4/WebM up to ${mib(MAX_VIDEO_BYTES)}. Everything is optimized automatically.`;
