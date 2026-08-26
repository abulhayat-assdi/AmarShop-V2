import type { StorageAdapter } from "./adapter";
import { LocalStorageAdapter } from "./local";

export type { StorageAdapter };

// Single switch point for a future move to Cloudflare R2 (or any other
// S3-compatible backend) — add an R2StorageAdapter implementing the same
// interface and change only this function.
export function getStorageAdapter(): StorageAdapter {
  return new LocalStorageAdapter();
}
