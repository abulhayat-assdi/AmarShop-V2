// See src/lib/invoices/pdf.ts for why this import must come first.
import "regenerator-runtime/runtime";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { code128BModules } from "./code128";

// Self-generated A4 parcel label (user decision — no courier-API label
// dependency, so it works without a live courier account). The label sits
// in the top ~half; a dashed rule marks where to cut. Reuses the four
// vendored fonts in src/lib/invoices/fonts (Bengali address support).

const FONT_DIR = path.join(process.cwd(), "src/lib/invoices/fonts");

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.75, 0.75, 0.75);

export type ShipmentLabelData = {
  storeName: string;
  providerLabel: string;
  consignmentId: string;
  trackingCode: string | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: string;
  itemCount: number;
  orderCode: string;
};

export async function renderShipmentLabelPdf(data: ShipmentLabelData): Promise<Buffer> {
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
  const latinCov = fontkit.create(latinReg);

  const page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Per-char Latin/Bengali fallback (compact copy of pdf.ts's drawRich).
  const runsFor = (s: string, bold: boolean) => {
    const latin = bold ? fLatinBold : fLatin;
    const bn = bold ? fBnBold : fBn;
    const runs: { text: string; font: PDFFont }[] = [];
    for (const ch of s) {
      const font = latinCov.hasGlyphForCodePoint(ch.codePointAt(0)!) ? latin : bn;
      const last = runs[runs.length - 1];
      if (last && last.font === font) last.text += ch;
      else runs.push({ text: ch, font });
    }
    return runs;
  };
  const richWidth = (s: string, size: number, bold = false) =>
    runsFor(s, bold).reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);
  const draw = (
    s: string,
    x: number,
    size: number,
    opts: { bold?: boolean; color?: typeof INK; align?: "left" | "right" | "center" } = {}
  ) => {
    const runs = runsFor(s, !!opts.bold);
    const total = richWidth(s, size, !!opts.bold);
    let cursor = opts.align === "right" ? x - total : opts.align === "center" ? x - total / 2 : x;
    for (const r of runs) {
      page.drawText(r.text, { x: cursor, y, size, font: r.font, color: opts.color ?? INK });
      cursor += r.font.widthOfTextAtSize(r.text, size);
    }
  };
  const wrap = (s: string, size: number, maxW: number): string[] => {
    const words = s.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (richWidth(next, size) > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const rule = (yy: number) => {
    page.drawLine({ start: { x: MARGIN, y: yy }, end: { x: PAGE_W - MARGIN, y: yy }, thickness: 1, color: RULE });
  };

  // ── header
  draw(data.storeName, MARGIN, 14, { bold: true });
  draw(`${data.providerLabel} · SHIPPING LABEL`, PAGE_W - MARGIN, 9, { align: "right", color: MUTED });
  y -= 16;
  rule(y);
  y -= 22;

  // ── consignment + barcode
  draw("CONSIGNMENT ID", MARGIN, 8, { color: MUTED });
  y -= 20;
  draw(data.consignmentId, MARGIN, 20, { bold: true });
  y -= 30;

  const barcodeText = (data.trackingCode || data.consignmentId).slice(0, 32);
  const mods = code128BModules(barcodeText);
  const totalMods = mods.reduce((s, m) => s + m.width, 0);
  const unit = CONTENT_W / totalMods;
  const barH = 46;
  let bx = MARGIN;
  for (const m of mods) {
    if (m.bar) {
      page.drawRectangle({ x: bx, y: y - barH, width: m.width * unit, height: barH, color: INK });
    }
    bx += m.width * unit;
  }
  y -= barH + 12;
  draw(barcodeText, PAGE_W / 2, 9, { align: "center", color: MUTED });
  y -= 16;
  rule(y);
  y -= 22;

  // ── recipient
  draw("DELIVER TO", MARGIN, 8, { bold: true, color: MUTED });
  y -= 18;
  draw(data.recipientName, MARGIN, 13, { bold: true });
  y -= 16;
  draw(data.recipientPhone, MARGIN, 12);
  y -= 16;
  for (const line of wrap(data.recipientAddress, 11, CONTENT_W)) {
    draw(line, MARGIN, 11, { color: MUTED });
    y -= 14;
  }
  y -= 8;
  rule(y);
  y -= 26;

  // ── COD / prepaid
  const cod = Number(data.codAmount);
  if (cod > 0) {
    const boxH = 30;
    page.drawRectangle({
      x: MARGIN,
      y: y - boxH + 8,
      width: CONTENT_W,
      height: boxH,
      borderColor: INK,
      borderWidth: 1.5,
    });
    draw(`COLLECT  ৳${data.codAmount}`, PAGE_W / 2, 15, { bold: true, align: "center" });
    y -= boxH + 6;
  } else {
    draw("PREPAID — do not collect cash", MARGIN, 12, { bold: true });
    y -= 20;
  }
  draw(
    `${data.itemCount} item${data.itemCount === 1 ? "" : "s"}  ·  Order ${data.orderCode}`,
    MARGIN,
    10,
    { color: MUTED }
  );
  y -= 22;

  const printedOn = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  draw(`Printed ${printedOn}  ·  via AmarShop`, MARGIN, 8, { color: MUTED });

  // ── cut line ~ top-half boundary
  const cutY = Math.min(y - 24, PAGE_H / 2);
  page.drawLine({
    start: { x: 0, y: cutY },
    end: { x: PAGE_W, y: cutY },
    thickness: 0.75,
    color: MUTED,
    dashArray: [4, 4],
  });
  page.drawText("- - -  cut here  - - -", {
    x: MARGIN,
    y: cutY + 4,
    size: 7,
    font: fLatin,
    color: MUTED,
  });

  return Buffer.from(await doc.save());
}
