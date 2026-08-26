import { promises as fs } from "fs";
import path from "path";
import type { StorageAdapter } from "./adapter";

const uploadsRoot = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");

// Keys can be influenced by user-supplied filenames upstream (product image
// uploads, etc.) — resolve and confine every path to uploadsRoot so a key
// like "../../etc/passwd" can't read or write outside the uploads dir.
function resolveKeyPath(key: string): string {
  const filePath = path.resolve(uploadsRoot, key);
  if (filePath !== uploadsRoot && !filePath.startsWith(uploadsRoot + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return filePath;
}

export class LocalStorageAdapter implements StorageAdapter {
  async put(key: string, data: Buffer | Uint8Array): Promise<{ key: string; url: string }> {
    const filePath = resolveKeyPath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return { key, url: this.url(key) };
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(resolveKeyPath(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(resolveKeyPath(key), { force: true });
  }

  url(key: string): string {
    return `/uploads/${key.split(path.sep).map(encodeURIComponent).join("/")}`;
  }
}
