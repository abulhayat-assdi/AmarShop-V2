import { randomUUID } from "crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { getStorageAdapter } from "@/lib/storage";
import {
  orderItems,
  productDigitalFiles,
  productVariants,
  products,
  type Order,
} from "@/db/schema";

import {
  MAX_DIGITAL_FILE_BYTES,
  MAX_DIGITAL_FILE_MB,
  MAX_DIGITAL_FILES,
} from "./digital-constants";

export { MAX_DIGITAL_FILE_BYTES, MAX_DIGITAL_FILES } from "./digital-constants";

const PDF_MAGIC = "%PDF-";

export type DigitalValidation =
  | { ok: { name: string; buf: Buffer }[] }
  | { error: string };

function realFiles(list: File[]): File[] {
  return list.filter((f): f is File => f instanceof File && f.size > 0);
}

// Digital products deliver PDF files only — checked on type, extension and
// the leading magic bytes so a renamed non-PDF is rejected.
export async function validateDigitalPdfs(
  raw: File[],
  existingCount = 0
): Promise<DigitalValidation> {
  const files = realFiles(raw);
  if (files.length === 0) return { ok: [] };

  if (existingCount + files.length > MAX_DIGITAL_FILES) {
    return {
      error: `A digital product can have at most ${MAX_DIGITAL_FILES} files (this one already has ${existingCount}).`,
    };
  }

  const out: { name: string; buf: Buffer }[] = [];
  for (const file of files) {
    if (file.size > MAX_DIGITAL_FILE_BYTES) {
      return { error: `"${file.name}" is larger than ${MAX_DIGITAL_FILE_MB} MB.` };
    }
    const isPdfType = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfType) return { error: `"${file.name}" isn't a PDF.` };
    const buf = Buffer.from(await file.arrayBuffer());
    if (!buf.subarray(0, 5).toString("latin1").startsWith(PDF_MAGIC)) {
      return { error: `"${file.name}" isn't a valid PDF file.` };
    }
    out.push({ name: file.name, buf });
  }
  return { ok: out };
}

export async function storeDigitalFiles(
  storeId: string,
  productId: string,
  files: { name: string; buf: Buffer }[]
): Promise<void> {
  if (files.length === 0) return;
  const adapter = getStorageAdapter();

  const pending: { storageKey: string; fileName: string; sizeBytes: number }[] = [];
  for (const file of files) {
    const key = `digital/${storeId}/${productId}/${randomUUID()}.pdf`;
    await adapter.put(key, file.buf, "application/pdf");
    pending.push({ storageKey: key, fileName: file.name, sizeBytes: file.buf.length });
  }

  await withStoreContext(storeId, (tx) =>
    tx.insert(productDigitalFiles).values(pending.map((p) => ({ storeId, productId, ...p })))
  );
}

export async function getDigitalFiles(storeId: string, productId: string) {
  return withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: productDigitalFiles.id,
        fileName: productDigitalFiles.fileName,
        sizeBytes: productDigitalFiles.sizeBytes,
      })
      .from(productDigitalFiles)
      .where(
        and(
          eq(productDigitalFiles.storeId, storeId),
          eq(productDigitalFiles.productId, productId)
        )
      )
  );
}

export async function removeDigitalFile(
  storeId: string,
  productId: string,
  fileId: string
): Promise<void> {
  const [row] = await withStoreContext(storeId, (tx) =>
    tx
      .delete(productDigitalFiles)
      .where(
        and(
          eq(productDigitalFiles.storeId, storeId),
          eq(productDigitalFiles.productId, productId),
          eq(productDigitalFiles.id, fileId)
        )
      )
      .returning({ storageKey: productDigitalFiles.storageKey })
  );
  if (row) {
    try {
      await getStorageAdapter().delete(row.storageKey);
    } catch (err) {
      console.error("[digital] file delete failed", err);
    }
  }
}

export type OrderDigitalFile = {
  fileId: string;
  fileName: string;
  productVariantId: string | null;
};

// The digital PDFs for an order, resolved live from the products still in
// it — for the confirmation / track pages.
export async function getOrderDigitalFiles(
  storeId: string,
  orderId: string
): Promise<OrderDigitalFile[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select({
        fileId: productDigitalFiles.id,
        fileName: productDigitalFiles.fileName,
        productVariantId: orderItems.productVariantId,
      })
      .from(orderItems)
      .innerJoin(productVariants, eq(productVariants.id, orderItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(productDigitalFiles, eq(productDigitalFiles.productId, products.id))
      .where(and(eq(orderItems.storeId, storeId), eq(orderItems.orderId, orderId)))
  );
}

export async function orderHasPhysicalLine(storeId: string, orderId: string): Promise<boolean> {
  const [{ count }] = await withStoreContext(storeId, (tx) =>
    tx
      .select({ count: sql<number>`count(*)::int` })
      .from(orderItems)
      .innerJoin(productVariants, eq(productVariants.id, orderItems.productVariantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(orderItems.storeId, storeId),
          eq(orderItems.orderId, orderId),
          ne(products.isDigital, true)
        )
      )
  );
  return count > 0;
}

// A digital download is released once payment is confirmed, OR when the
// order also has a physical line (a mixed COD order — the merchant is
// trusting delivery for the physical part anyway).
export function canReleaseDownloads(
  _order: Pick<Order, "id">,
  payment: { status: string } | null,
  hasPhysicalLine: boolean
): boolean {
  return payment?.status === "paid" || hasPhysicalLine;
}
