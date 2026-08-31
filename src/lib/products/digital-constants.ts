// Client-safe: the numeric limits for digital-product PDF uploads, shared
// by the server-only validator (src/lib/products/digital.ts) and the
// product form's hint text so the figure lives in exactly one place.
export const MAX_DIGITAL_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_DIGITAL_FILES = 10;
export const MAX_DIGITAL_FILE_MB = MAX_DIGITAL_FILE_BYTES / (1024 * 1024);
