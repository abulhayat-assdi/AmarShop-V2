// @pdf-lib/fontkit's UMD bundle runs a regenerator-based code path when it
// shapes a complex script (Bengali) and expects a global regeneratorRuntime
// — this import provides it. Must come first.
import "regenerator-runtime/runtime";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Two typefaces, embedded because pdf-lib's standard fonts are Latin-only:
//   - DejaVu Sans        → Latin body text (no Bengali coverage)
//   - Noto Sans Bengali  → the ৳ (U+09F3) sign in amounts, AND any Bengali
//                          script in free-text fields (customer name/address,
//                          product names a merchant typed in Bengali).
// A per-character fallback (drawRich, below) picks between them so a Bengali
// name on a real order renders instead of tofu. Vendored under fonts/ with
// their licenses; next.config.ts force-includes this dir in the standalone
// build's file trace.
const FONT_DIR = path.join(process.cwd(), "src/lib/invoices/fonts");

export type InvoicePdfData = {
  storeName: string;
  invoiceDate: Date;
  orderRef: string; // "K7M2-9XQ4" — the order code, the only reference shown
  customer: { name: string; phone: string; email: string | null; address: string };
  items: {
    name: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  subtotal: string;
  discountAmount: string;
  discountLabel: string | null; // "Discount (EID2026)" — null when none
  deliveryCharge: string;
  deliveryZoneName: string | null;
  total: string;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
};

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.4, 0.4, 0.4);
const RULE = rgb(0.8, 0.8, 0.8);

// Line-item table column anchors.
const COL_ITEM = MARGIN;
const COL_QTY = MARGIN + 300;
const COL_UNIT = MARGIN + 360;
const COL_RIGHT = PAGE_W - MARGIN; // right edge — amounts are right-aligned here
const ITEM_NAME_MAX_W = COL_QTY - COL_ITEM - 12;

function formatTaka(value: string | number): string {
  const n = Number(value);
  const amount = Number.isFinite(n) ? n : 0;
  return `৳${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const [latinReg, latinBold, bnReg, bnBold] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, "DejaVuSans.ttf")),
    fs.readFile(path.join(FONT_DIR, "DejaVuSans-Bold.ttf")),
    fs.readFile(path.join(FONT_DIR, "NotoSansBengali-Regular.ttf")),
    fs.readFile(path.join(FONT_DIR, "NotoSansBengali-Bold.ttf")),
  ]);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fLatin = await doc.embedFont(latinReg, { subset: true });
  const fLatinBold = await doc.embedFont(latinBold, { subset: true });
  const fBn = await doc.embedFont(bnReg, { subset: true });
  const fBnBold = await doc.embedFont(bnBold, { subset: true });
  // Coverage oracle for the Latin faces — decides per char whether to fall
  // back to the Bengali face.
  const latinCov = fontkit.create(latinReg);

  const pages: PDFPage[] = [];
  let page = doc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);
  let y = PAGE_H - MARGIN;

  type Opts = { bold?: boolean; money?: boolean; color?: typeof INK; align?: "left" | "right" };

  // Fixed strings we author ourselves — always Latin face.
  const text = (s: string, x: number, size: number, opts: Opts = {}) => {
    const f = opts.money
      ? opts.bold
        ? fBnBold
        : fBn
      : opts.bold
        ? fLatinBold
        : fLatin;
    const drawX = opts.align === "right" ? x - f.widthOfTextAtSize(s, size) : x;
    page.drawText(s, { x: drawX, y, size, font: f, color: opts.color ?? INK });
  };

  // User-supplied strings — may mix Latin and Bengali. Split into runs by
  // glyph coverage and draw each with the right face.
  const runsFor = (s: string, bold: boolean) => {
    const latin = bold ? fLatinBold : fLatin;
    const bn = bold ? fBnBold : fBn;
    const runs: { text: string; font: PDFFont }[] = [];
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      const font = latinCov.hasGlyphForCodePoint(cp) ? latin : bn;
      const last = runs[runs.length - 1];
      if (last && last.font === font) last.text += ch;
      else runs.push({ text: ch, font });
    }
    return runs;
  };
  const richWidth = (s: string, size: number, bold = false) =>
    runsFor(s, bold).reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);
  const drawRich = (s: string, x: number, size: number, opts: Opts = {}) => {
    const runs = runsFor(s, !!opts.bold);
    let cursor = opts.align === "right" ? x - richWidth(s, size, !!opts.bold) : x;
    for (const r of runs) {
      page.drawText(r.text, { x: cursor, y, size, font: r.font, color: opts.color ?? INK });
      cursor += r.font.widthOfTextAtSize(r.text, size);
    }
  };
  const truncateRich = (s: string, size: number, maxWidth: number) => {
    if (richWidth(s, size) <= maxWidth) return s;
    let out = s;
    while (out.length > 1 && richWidth(`${out}…`, size) > maxWidth) out = out.slice(0, -1);
    return `${out}…`;
  };
  const wrapRich = (s: string, size: number, maxWidth: number): string[] => {
    const words = s.replace(/\s+/g, " ").trim().split(" ");
    if (words.length === 0 || words[0] === "") return [];
    const lines: string[] = [];
    let line = words[0];
    for (const w of words.slice(1)) {
      const candidate = `${line} ${w}`;
      if (richWidth(candidate, size) > maxWidth) {
        lines.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
    return lines;
  };

  const hr = () => {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.75,
      color: RULE,
    });
  };
  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 40) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      y = PAGE_H - MARGIN;
    }
  };

  // ---- Header ----
  drawRich(data.storeName, MARGIN, 20, { bold: true });
  text("TAX INVOICE", COL_RIGHT, 20, { bold: true, align: "right" });
  y -= 24;
  // One reference only, and it's the order code the customer already has
  // on their confirmation page and types into /track. A sequential
  // "INV-000123" here would have leaked the merchant's order volume to
  // anyone comparing two invoices — the same reason the order code itself
  // isn't sequential (src/lib/orders/number.ts).
  text(`Order ${data.orderRef}`, COL_RIGHT, 11, { align: "right", color: MUTED });
  y -= 14;
  text(`Date: ${formatDate(data.invoiceDate)}`, COL_RIGHT, 11, { align: "right", color: MUTED });
  y -= 20;
  hr();
  y -= 24;

  // ---- Bill to ----
  text("BILL TO", MARGIN, 10, { bold: true, color: MUTED });
  y -= 16;
  drawRich(data.customer.name, MARGIN, 12);
  y -= 14;
  text(data.customer.phone, MARGIN, 11, { color: MUTED });
  y -= 14;
  if (data.customer.email) {
    text(data.customer.email, MARGIN, 11, { color: MUTED });
    y -= 14;
  }
  for (const line of wrapRich(data.customer.address, 11, CONTENT_W)) {
    drawRich(line, MARGIN, 11, { color: MUTED });
    y -= 14;
  }
  y -= 12;

  // ---- Items table ----
  text("ITEM", COL_ITEM, 10, { bold: true, color: MUTED });
  text("QTY", COL_QTY, 10, { bold: true, color: MUTED });
  text("UNIT", COL_UNIT, 10, { bold: true, color: MUTED });
  text("AMOUNT", COL_RIGHT, 10, { bold: true, color: MUTED, align: "right" });
  y -= 8;
  hr();
  y -= 16;

  for (const item of data.items) {
    ensureSpace(32);
    drawRich(truncateRich(item.name, 11, ITEM_NAME_MAX_W), COL_ITEM, 11);
    text(String(item.quantity), COL_QTY, 11);
    text(formatTaka(item.unitPrice), COL_UNIT, 11, { money: true });
    text(formatTaka(item.lineTotal), COL_RIGHT, 11, { money: true, align: "right" });
    y -= 13;
    text(item.sku, COL_ITEM, 9, { color: MUTED });
    y -= 17;
  }

  hr();
  y -= 20;

  // ---- Totals ----
  const totalRow = (label: string, value: string, strong = false) => {
    ensureSpace(18);
    drawRich(label, COL_RIGHT - 95, 11, {
      bold: strong,
      color: strong ? INK : MUTED,
      align: "right",
    });
    text(value, COL_RIGHT, 11, { money: true, bold: strong, align: "right" });
    y -= 16;
  };
  totalRow("Subtotal", formatTaka(data.subtotal));
  if (data.discountLabel && Number(data.discountAmount) > 0) {
    totalRow(data.discountLabel, `−${formatTaka(data.discountAmount)}`);
  }
  totalRow(
    data.deliveryZoneName ? `Delivery — ${data.deliveryZoneName}` : "Delivery",
    formatTaka(data.deliveryCharge)
  );
  y -= 2;
  totalRow("Total", formatTaka(data.total), true);
  y -= 16;

  // ---- Payment ----
  ensureSpace(18);
  drawRich(`Payment: ${data.paymentMethodLabel} — ${data.paymentStatusLabel}`, MARGIN, 11, {
    color: MUTED,
  });

  // ---- Footer on every page ----
  for (const p of pages) {
    p.drawText("Generated by AmarShop", {
      x: MARGIN,
      y: MARGIN - 14,
      size: 9,
      font: fLatin,
      color: MUTED,
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
