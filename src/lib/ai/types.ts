// Client-safe metadata for the AI copywriter. The adapters and the
// service wrapper are server-only.

export type CopywriterProvider = "openai" | "anthropic" | "stub";

export type DescribeProductInput = {
  name: string;
  category: string | null;
  brand: string | null;
  priceBdt: number | null;
  locale: "bn" | "en";
};

export type SeoResult = { title: string; metaDescription: string };
