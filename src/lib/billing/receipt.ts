// See src/lib/invoices/pdf.ts for why this import must come first.
import "regenerator-runtime/runtime";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { messagesFor } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translate";
import { BILLING_CYCLE_KEYS, PLATFORM_INVOICE_STATUS_KEYS } from "@/lib/enum-labels";
import { PLANS, isValidPlanId } from "./plans";
import type { PlatformInvoice, Store } from "@/db/schema";

// Vendored under src/lib/invoices/fonts (next.config.ts force-includes the
// dir in the standalone trace) — reused here so ৳ + Bengali labels render.
const FONT_DIR = path.join(process.cwd(), "src/lib/invoices/fonts");

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 56;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.82, 0.82, 0.82);

function fmtDate(d: Date | null): string {
  return d
    ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}

export type PlatformReceiptData = {
  invoice: PlatformInvoice;
  store: Pick<Store, "name" | "slug" | "locale">;
};

export async function renderPlatformReceiptPdf(data: PlatformReceiptData): Promise<Buffer> {
  const { invoice, store } = data;
  const t = createTranslator(messagesFor(isLocale(store.locale) ? store.locale : DEFAULT_LOCALE));

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

  // Per-char Latin/Bengali fallback (compact version of pdf.ts's drawRich).
  const draw = (s: string, x: number, size: number, opts: { bold?: boolean; color?: typeof INK } = {}) => {
    const latin = opts.bold ? fLatinBold : fLatin;
    const bn = opts.bold ? fBnBold : fBn;
    let cursor = x;
    let runText = "";
    let runFont: PDFFont = latin;
    const flush = () => {
      if (!runText) return;
      page.drawText(runText, { x: cursor, y, size, font: runFont, color: opts.color ?? INK });
      cursor += runFont.widthOfTextAtSize(runText, size);
      runText = "";
    };
    for (const ch of s) {
      const font = latinCov.hasGlyphForCodePoint(ch.codePointAt(0)!) ? latin : bn;
      if (font !== runFont) {
        flush();
        runFont = font;
      }
      runText += ch;
    }
    flush();
  };

  draw(t("billing.receipt.title"), MARGIN, 18, { bold: true });
  y -= 14;
  draw("AmarShop", MARGIN, 10, { color: MUTED });
  y -= 26;
  page.drawLine({
    start: { x: MARGIN, y: y + 8 },
    end: { x: PAGE_W - MARGIN, y: y + 8 },
    thickness: 1,
    color: RULE,
  });
  y -= 8;

  const planName = isValidPlanId(invoice.plan) ? t(PLANS[invoice.plan].nameKey) : invoice.plan;
  const rows: [string, string][] = [
    [t("billing.receipt.store"), `${store.name} (${store.slug})`],
    [t("billing.receipt.invoiceId"), invoice.id],
    [t("billing.receipt.plan"), planName],
    [t("billing.receipt.cycle"), t(BILLING_CYCLE_KEYS[invoice.cycle])],
    [
      t("billing.receipt.period"),
      `${fmtDate(invoice.periodStart)} – ${fmtDate(invoice.periodEnd)}`,
    ],
    [t("billing.receipt.amount"), `৳${invoice.amount}`],
    [
      t("billing.receipt.status"),
      t(PLATFORM_INVOICE_STATUS_KEYS[invoice.status]),
    ],
    [t("billing.receipt.paidOn"), fmtDate(invoice.paidAt)],
  ];
  if (invoice.senderReference) {
    rows.push([t("billing.receipt.txn"), invoice.senderReference]);
  }

  for (const [label, value] of rows) {
    draw(label, MARGIN, 10.5, { color: MUTED });
    draw(value, MARGIN + 150, 10.5, { bold: label === t("billing.receipt.amount") });
    y -= 20;
  }

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y: y + 8 },
    end: { x: PAGE_W - MARGIN, y: y + 8 },
    thickness: 1,
    color: RULE,
  });
  y -= 10;
  draw(t("billing.receipt.thanks"), MARGIN, 9.5, { color: MUTED });

  return Buffer.from(await doc.save());
}
