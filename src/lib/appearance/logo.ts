import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { getStorageAdapter } from "@/lib/storage";
import { optimizeImage } from "@/lib/images/optimize";
import { ALLOWED_IMAGE_TYPES } from "@/lib/products/media-constants";

// Store logos, same shape as OAuth app logos (src/lib/oauth/logo.ts):
// stored via the storage adapter at store-logos/<storeId>/logo-<uuid>.webp
// (uuid so a replacement gets a fresh URL past any cache), public URL kept
// on stores.logo_url. `stores` is outside the RLS boundary — plain `db`.

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MiB
const LOGO_EDGE = 256;

export function validateLogoFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "admin.appearance.errLogo";
  }
  if (file.size > MAX_LOGO_BYTES) return "admin.appearance.errLogo";
  return null;
}

// A zero-byte / nameless entry is what an untouched <input type="file">
// still submits — treat that as "no logo provided".
export function isRealFile(v: FormDataEntryValue | null): v is File {
  return v instanceof File && v.size > 0 && v.name !== "";
}

async function currentLogoKey(storeId: string): Promise<string | null> {
  const [row] = await db.select({ logoUrl: stores.logoUrl }).from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!row?.logoUrl) return null;
  const m = /\/uploads\/(.+)$/.exec(row.logoUrl);
  return m ? decodeURIComponent(m[1]) : null;
}

// Re-encode, store, point stores.logo_url at it, best-effort delete the
// previous file. Validate with validateLogoFile() before calling.
export async function setStoreLogo(storeId: string, file: File): Promise<string> {
  const previous = await currentLogoKey(storeId);
  const out = await optimizeImage(Buffer.from(await file.arrayBuffer()), LOGO_EDGE);
  const key = `store-logos/${storeId}/logo-${randomUUID()}.webp`;
  const { url } = await getStorageAdapter().put(key, out.data, out.contentType);
  await db.update(stores).set({ logoUrl: url, updatedAt: new Date() }).where(eq(stores.id, storeId));
  if (previous && previous !== key) {
    try {
      await getStorageAdapter().delete(previous);
    } catch {
      /* orphan file is harmless */
    }
  }
  return url;
}

export async function removeStoreLogo(storeId: string): Promise<void> {
  const previous = await currentLogoKey(storeId);
  await db.update(stores).set({ logoUrl: null, updatedAt: new Date() }).where(eq(stores.id, storeId));
  if (previous) {
    try {
      await getStorageAdapter().delete(previous);
    } catch {
      /* ignore */
    }
  }
}
