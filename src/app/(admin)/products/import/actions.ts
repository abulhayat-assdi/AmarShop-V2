"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { categories } from "@/db/schema";
import { parseImportCsv, type NormalizedProduct } from "@/lib/products/import";
import { commitImport, existingSkuSet } from "@/lib/products/import-commit";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

export type PreviewRow = {
  line: number;
  name: string;
  sku: string;
  price: string;
  category: string | null;
  status: "ok" | "skip";
  reason?: MessageRef;
  newCategory?: boolean;
};

export type PreviewState = {
  headerError?: MessageRef;
  rows?: PreviewRow[];
  rawCsv?: string;
  summary?: { willImport: number; skipped: number; newCategories: string[] };
};

const MAX_CSV_BYTES = 1_000_000;

export async function previewImportAction(
  _prev: PreviewState,
  formData: FormData
): Promise<PreviewState> {
  const session = await requireStaffSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { headerError: msg("import.errFile") };
  if (file.size > MAX_CSV_BYTES) return { headerError: msg("import.errFileTooLarge") };

  const text = await file.text();
  const parsed = parseImportCsv(text);
  if ("headerError" in parsed) return { headerError: parsed.headerError };

  const okProducts = parsed.rows
    .filter((r) => r.result.ok)
    .map((r) => (r.result as { ok: true; product: NormalizedProduct }).product);

  // Which SKUs already exist, and which category names are new.
  const skuExists = await existingSkuSet(
    session.user.storeId,
    okProducts.map((p) => p.sku)
  );
  const existingCatNames = new Set(
    (
      await withStoreContext(session.user.storeId, (tx) =>
        tx
          .select({ name: categories.name })
          .from(categories)
          .where(eq(categories.storeId, session.user.storeId))
      )
    ).map((c) => c.name.trim().toLowerCase())
  );

  const newCategories = new Set<string>();
  const rows: PreviewRow[] = parsed.rows.map((r) => {
    const base = {
      line: r.line,
      name: (r.raw.name ?? "").trim(),
      sku: (r.raw.sku ?? "").trim(),
      price: (r.raw.price ?? "").trim(),
      category: (r.raw.category ?? "").trim() || null,
    };
    if (!r.result.ok) return { ...base, status: "skip", reason: r.result.reason };

    const p = r.result.product;
    if (skuExists.has(p.sku.toLowerCase())) {
      return { ...base, status: "skip", reason: msg("import.errSkuExists") };
    }
    const newCategory = !!p.categoryName && !existingCatNames.has(p.categoryName.trim().toLowerCase());
    if (newCategory) newCategories.add(p.categoryName!.trim());
    return { ...base, status: "ok", newCategory };
  });

  const willImport = rows.filter((r) => r.status === "ok").length;
  return {
    rows,
    rawCsv: text,
    summary: {
      willImport,
      skipped: rows.length - willImport,
      newCategories: [...newCategories],
    },
  };
}

export type ConfirmState = { error?: MessageRef };

export async function confirmImportAction(
  _prev: ConfirmState,
  formData: FormData
): Promise<ConfirmState> {
  const session = await requireStaffSession();

  const text = String(formData.get("csv") ?? "");
  // Never trust a client-supplied row list — re-parse from scratch.
  const parsed = parseImportCsv(text);
  if ("headerError" in parsed) return { error: parsed.headerError };

  const products = parsed.rows
    .filter((r) => r.result.ok)
    .map((r) => (r.result as { ok: true; product: NormalizedProduct }).product);
  if (products.length === 0) return { error: msg("import.errNothingToImport") };

  let created: number;
  try {
    ({ created } = await commitImport(session.user.storeId, products));
  } catch (err) {
    if ((err as { isRowConflict?: boolean } | null)?.isRowConflict) {
      return { error: msg("import.errRowConflict", { line: (err as { line: number }).line }) };
    }
    throw err;
  }

  revalidatePath("/products");
  redirect(`/products?imported=${created}`);
}
