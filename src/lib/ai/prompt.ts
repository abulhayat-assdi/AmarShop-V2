import type { DescribeProductInput, SeoResult } from "./types";

const TITLE_MAX = 70;
const META_MAX = 165;

function productFacts(input: DescribeProductInput): string {
  return [
    `Product name: ${input.name}`,
    input.category ? `Category: ${input.category}` : null,
    input.brand ? `Brand: ${input.brand}` : null,
    input.priceBdt != null ? `Price: ${input.priceBdt} BDT` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// One place the copywriting instructions live — both real adapters
// (openai.ts, anthropic.ts) build their request from this.
export function buildDescribePrompt(input: DescribeProductInput): {
  system: string;
  user: string;
} {
  const language = input.locale === "bn" ? "Bengali (Bangla)" : "English";

  const system = [
    "You write product descriptions for a small online store in Bangladesh.",
    `Write in ${language}.`,
    "Write 2 to 4 sentences, about 60 words, as one plain paragraph.",
    "No headings, no markdown, no bullet points, no emojis, no quotation marks around the whole thing.",
    "Only use the facts given. Do not invent specifications, materials, sizes, prices, discounts, warranties, or claims.",
    "Do not mention the price unless a price is given, and never promise delivery times or offers.",
    "Return only the description text, nothing else.",
  ].join(" ");

  return { system, user: `Write a description for this product:\n${productFacts(input)}` };
}

export function buildSeoPrompt(input: DescribeProductInput): { system: string; user: string } {
  const language = input.locale === "bn" ? "Bengali (Bangla)" : "English";
  const system = [
    "You write SEO metadata for an online store's product page.",
    `Write in ${language}.`,
    "Produce an SEO title of at most 60 characters and a meta description of at most 155 characters.",
    "Plain text only: no markdown, no surrounding quotes, no emojis.",
    "Use only the facts given — do not invent specs, materials, prices, discounts, or claims.",
    "Reply with exactly two lines and nothing else:",
    "TITLE: <the title>",
    "DESCRIPTION: <the meta description>",
  ].join(" ");
  return { system, user: `Write SEO metadata for this product:\n${productFacts(input)}` };
}

// Lenient parse of the two-line "TITLE: / DESCRIPTION:" reply. Falls back
// to using the whole reply as the description and the first line (or the
// product name) as the title. Lengths are clamped so a chatty model can't
// blow past the meta limits.
export function parseSeoOutput(raw: string, fallbackTitle: string): SeoResult {
  const text = (raw ?? "").trim();
  const titleMatch = text.match(/^\s*title\s*[:\-]\s*(.+)$/im);
  const descMatch = text.match(/^\s*(?:description|meta(?:\s*description)?)\s*[:\-]\s*(.+)$/im);

  let title = titleMatch?.[1]?.trim() ?? "";
  let metaDescription = descMatch?.[1]?.trim() ?? "";

  if (!title && !metaDescription) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    title = lines[0] ?? fallbackTitle;
    metaDescription = lines.slice(1).join(" ") || lines[0] || fallbackTitle;
  } else if (!title) {
    title = fallbackTitle;
  } else if (!metaDescription) {
    metaDescription = title;
  }

  const strip = (s: string) => s.replace(/^["'\s]+|["'\s]+$/g, "");
  return {
    title: strip(title).slice(0, TITLE_MAX),
    metaDescription: strip(metaDescription).slice(0, META_MAX),
  };
}
