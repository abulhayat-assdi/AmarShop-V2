import type { DescribeProductInput } from "./types";

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

  const facts = [
    `Product name: ${input.name}`,
    input.category ? `Category: ${input.category}` : null,
    input.brand ? `Brand: ${input.brand}` : null,
    input.priceBdt != null ? `Price: ${input.priceBdt} BDT` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user: `Write a description for this product:\n${facts}` };
}
