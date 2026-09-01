"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import {
  createMediaFolder,
  deleteMediaFolder,
  renameMediaFolder,
} from "@/lib/media/folders";
import {
  deleteMediaAsset,
  storeMediaAssets,
  updateMediaAsset,
  validateMediaUpload,
} from "@/lib/media/assets";

export type MediaState = { error?: string; ok?: boolean; count?: number };

// Media Library sits in SITE_STRUCTURE.md's "Content" group next to Blog;
// it reuses the existing content:manage permission rather than minting a
// new one (owner/admin keep unconditional access via requirePermission).

export async function uploadMediaAction(
  _prev: MediaState,
  formData: FormData
): Promise<MediaState> {
  const session = await requirePermission("content:manage");

  const files = formData.getAll("files").filter((v): v is File => v instanceof File);
  const folderId = String(formData.get("folderId") ?? "").trim() || null;

  const validation = await validateMediaUpload(files);
  if ("error" in validation) return { error: validation.error };

  const count = await storeMediaAssets(session.user.storeId, folderId, validation.ok);
  revalidatePath("/media");
  return { ok: true, count };
}

export async function updateMediaAssetAction(
  assetId: string,
  patch: { altText?: string | null; folderId?: string | null }
): Promise<void> {
  const session = await requirePermission("content:manage");
  await updateMediaAsset(session.user.storeId, assetId, patch);
  revalidatePath("/media");
}

export async function deleteMediaAssetAction(assetId: string): Promise<void> {
  const session = await requirePermission("content:manage");
  await deleteMediaAsset(session.user.storeId, assetId);
  revalidatePath("/media");
}

export async function createFolderAction(
  _prev: MediaState,
  formData: FormData
): Promise<MediaState> {
  const session = await requirePermission("content:manage");
  const result = await createMediaFolder(
    session.user.storeId,
    String(formData.get("name") ?? "")
  );
  if ("error" in result) return { error: result.error };
  revalidatePath("/media");
  return { ok: true };
}

export async function renameFolderAction(
  folderId: string,
  _prev: MediaState,
  formData: FormData
): Promise<MediaState> {
  const session = await requirePermission("content:manage");
  const result = await renameMediaFolder(
    session.user.storeId,
    folderId,
    String(formData.get("name") ?? "")
  );
  if ("error" in result) return { error: result.error };
  revalidatePath("/media");
  return { ok: true };
}

export async function deleteFolderAction(folderId: string): Promise<void> {
  const session = await requirePermission("content:manage");
  await deleteMediaFolder(session.user.storeId, folderId);
  revalidatePath("/media");
}
