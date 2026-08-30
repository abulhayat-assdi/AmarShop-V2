import Papa from "papaparse";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

// Pure parse + per-row validation for the bulk CSV import. No DB, no
// i18n rendering — every failure is a MessageRef the UI resolves. The
// row-level rules mirror parseProductForm in
// src/app/(admin)/products/actions.ts so a CSV import and a single-product
// create accept exactly the same values.

export const MAX_IMPORT_ROWS = 500;

const REQUIRED_COLUMNS = ["name", "sku", "price"] as const;
const OPTIONAL_COLUMNS = [
  "quantity",
  "category",
  "brand",
  "description",
  "discounted_price",
  "vat_percent",
  "status",
] as const;
export const CSV_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const STATUSES = ["draft", "active", "archived"] as const;
type ProductStatus = (typeof STATUSES)[number];

export type NormalizedProduct = {
  line: number;
  name: string;
  sku: string;
  price: string;
  quantity: number;
  categoryName: string | null;
  brand: string | null;
  description: string | null;
  discountedPrice: string | null;
  vatPercent: string;
  status: ProductStatus;
};

export type ParsedRow = {
  line: number;
  raw: Record<string, string>;
  result: { ok: true; product: NormalizedProduct } | { ok: false; reason: MessageRef };
};

export type ParseResult = { headerError: MessageRef } | { rows: ParsedRow[] };

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function isMoney(s: string): boolean {
  const n = Number(s);
  return s !== "" && Number.isFinite(n) && n >= 0;
}

export function parseImportCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normHeader,
  });

  const headers = (parsed.meta.fields ?? []).map(normHeader);
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return { headerError: msg("import.errHeader", { missing: missing.join(", ") }) };
  }

  const dataRows = parsed.data;
  if (dataRows.length === 0) return { headerError: msg("import.errEmpty") };
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return { headerError: msg("import.errTooManyRows", { max: MAX_IMPORT_ROWS }) };
  }

  const seenSku = new Set<string>();
  const rows: ParsedRow[] = dataRows.map((raw, i) => {
    const line = i + 2; // 1 = header row
    const get = (k: string) => (raw[k] ?? "").trim();

    const name = get("name");
    const sku = get("sku");
    const price = get("price");
    const quantityRaw = get("quantity");
    const discountedRaw = get("discounted_price");
    const vatRaw = get("vat_percent");
    const statusRaw = get("status").toLowerCase();

    const fail = (reason: MessageRef): ParsedRow => ({ line, raw, result: { ok: false, reason } });

    if (!name) return fail(msg("import.errName"));
    if (!sku) return fail(msg("import.errSku"));
    if (seenSku.has(sku.toLowerCase())) return fail(msg("import.errDuplicateInFile"));
    seenSku.add(sku.toLowerCase());
    if (!isMoney(price)) return fail(msg("import.errPrice"));

    let quantity = 0;
    if (quantityRaw !== "") {
      const q = Number(quantityRaw);
      if (!Number.isInteger(q) || q < 0) return fail(msg("import.errQuantity"));
      quantity = q;
    }

    if (discountedRaw !== "" && !isMoney(discountedRaw)) return fail(msg("import.errDiscountedPrice"));

    let vatPercent = "0";
    if (vatRaw !== "") {
      const v = Number(vatRaw);
      if (!Number.isFinite(v) || v < 0 || v > 100) return fail(msg("import.errVat"));
      vatPercent = vatRaw;
    }

    let status: ProductStatus = "draft";
    if (statusRaw !== "") {
      if (!(STATUSES as readonly string[]).includes(statusRaw)) return fail(msg("import.errStatus"));
      status = statusRaw as ProductStatus;
    }

    return {
      line,
      raw,
      result: {
        ok: true,
        product: {
          line,
          name,
          sku,
          price,
          quantity,
          categoryName: get("category") || null,
          brand: get("brand") || null,
          description: get("description") || null,
          discountedPrice: discountedRaw || null,
          vatPercent,
          status,
        },
      },
    };
  });

  return { rows };
}
