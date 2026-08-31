import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { oauthApps } from "@/db/schema";
import { getStorageAdapter } from "@/lib/storage";
import { optimizeImage } from "@/lib/images/optimize";
import { ALLOWED_IMAGE_TYPES } from "@/lib/products/media-constants";

// OAuth app logos. Stored via the storage adapter at
// oauth-apps/<appId>/logo-<uuid>.webp (uuid so a replacement gets a fresh
// URL past any cache), with the public URL kept on oauth_apps.logo_url.

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MiB
const LOGO_EDGE = 256;

export function validateLogoFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "platform.apps.errLogo";
  }
  if (file.size > MAX_LOGO_BYTES) return "platform.apps.errLogo";
  return null;
}

// A zero-byte / nameless entry is what an untouched <input type="file">
// still submits — treat that as "no logo provided".
export function isRealFile(v: FormDataEntryValue | null): v is File {
  return v instanceof File && v.size > 0 && v.name !== "";
}

async function currentLogoKey(appId: string): Promise<string | null> {
  const [row] = await db
    .select({ logoUrl: oauthApps.logoUrl })
    .from(oauthApps)
    .where(eq(oauthApps.id, appId))
    .limit(1);
  if (!row?.logoUrl) return null;
  const m = /\/uploads\/(.+)$/.exec(row.logoUrl);
  return m ? decodeURIComponent(m[1]) : null;
}

// Re-encode, store, point oauth_apps.logo_url at it, best-effort delete the
// previous file. Validate with validateLogoFile() before calling.
export async function setOAuthAppLogo(appId: string, file: File): Promise<string> {
  const previous = await currentLogoKey(appId);
  const out = await optimizeImage(Buffer.from(await file.arrayBuffer()), LOGO_EDGE);
  const key = `oauth-apps/${appId}/logo-${randomUUID()}.webp`;
  const { url } = await getStorageAdapter().put(key, out.data, out.contentType);
  await db.update(oauthApps).set({ logoUrl: url, updatedAt: new Date() }).where(eq(oauthApps.id, appId));
  if (previous && previous !== key) {
    try {
      await getStorageAdapter().delete(previous);
    } catch {
      /* orphan file is harmless */
    }
  }
  return url;
}

export async function removeOAuthAppLogo(appId: string): Promise<void> {
  const previous = await currentLogoKey(appId);
  await db.update(oauthApps).set({ logoUrl: null, updatedAt: new Date() }).where(eq(oauthApps.id, appId));
  if (previous) {
    try {
      await getStorageAdapter().delete(previous);
    } catch {
      /* ignore */
    }
  }
}
