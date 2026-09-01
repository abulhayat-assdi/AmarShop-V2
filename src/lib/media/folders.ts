import { and, asc, eq, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { mediaAssets, mediaFolders } from "@/db/schema";

// Media Library folders — flat, one level (see media-folders.ts). All
// reads/writes go through withStoreContext; the unique (store_id, name)
// index backs the duplicate check.

export type MediaFolderRow = {
  id: string;
  name: string;
  assetCount: number;
};

export async function listMediaFolders(storeId: string): Promise<MediaFolderRow[]> {
  const rows = await withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: mediaFolders.id,
        name: mediaFolders.name,
        assetCount: sql<number>`count(${mediaAssets.id})::int`,
      })
      .from(mediaFolders)
      .leftJoin(
        mediaAssets,
        and(eq(mediaAssets.folderId, mediaFolders.id), eq(mediaAssets.storeId, storeId))
      )
      .where(eq(mediaFolders.storeId, storeId))
      .groupBy(mediaFolders.id, mediaFolders.name)
      .orderBy(asc(mediaFolders.name))
  );
  return rows;
}

export type FolderResult = { ok: true; id: string } | { error: string };

export async function createMediaFolder(storeId: string, rawName: string): Promise<FolderResult> {
  const name = rawName.trim();
  if (!name) return { error: "admin.media.errFolderName" };
  if (name.length > 60) return { error: "admin.media.errFolderNameLong" };

  return withStoreContext(storeId, async (tx) => {
    const [existing] = await tx
      .select({ id: mediaFolders.id })
      .from(mediaFolders)
      .where(and(eq(mediaFolders.storeId, storeId), eq(mediaFolders.name, name)))
      .limit(1);
    if (existing) return { error: "admin.media.errFolderDuplicate" };

    const [row] = await tx
      .insert(mediaFolders)
      .values({ storeId, name })
      .returning({ id: mediaFolders.id });
    return { ok: true, id: row.id };
  });
}

export async function renameMediaFolder(
  storeId: string,
  folderId: string,
  rawName: string
): Promise<FolderResult> {
  const name = rawName.trim();
  if (!name) return { error: "admin.media.errFolderName" };
  if (name.length > 60) return { error: "admin.media.errFolderNameLong" };

  return withStoreContext(storeId, async (tx) => {
    const [clash] = await tx
      .select({ id: mediaFolders.id })
      .from(mediaFolders)
      .where(and(eq(mediaFolders.storeId, storeId), eq(mediaFolders.name, name)))
      .limit(1);
    if (clash && clash.id !== folderId) return { error: "admin.media.errFolderDuplicate" };

    await tx
      .update(mediaFolders)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(mediaFolders.id, folderId), eq(mediaFolders.storeId, storeId)));
    return { ok: true, id: folderId };
  });
}

// The folder row only. Its assets survive — the media_assets FK is
// ON DELETE SET NULL, so they fall back to the library root.
export async function deleteMediaFolder(storeId: string, folderId: string): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .delete(mediaFolders)
      .where(and(eq(mediaFolders.id, folderId), eq(mediaFolders.storeId, storeId)))
  );
}
