import type { CopywriterProvider, DescribeProductInput, SeoResult } from "./types";

// One implementation per LLM provider (CLAUDE.md rule #5). The app only
// ever talks to this interface — never a provider's HTTP API directly,
// outside that provider's own file. createCopywriterAdapter()
// (src/lib/ai/index.ts) is the single construction site.
export interface CopywriterAdapter {
  readonly provider: CopywriterProvider;
  describeProduct(input: DescribeProductInput): Promise<string>;
  generateSeo(input: DescribeProductInput): Promise<SeoResult>;
}

// No provider / API key configured — the feature is off for this deploy.
export class AiNotConfiguredError extends Error {
  constructor(detail: string) {
    super(`AI writing isn't configured. (${detail})`);
    this.name = "AiNotConfiguredError";
  }
}

// Any failed provider call (bad key, rejected request, network, malformed
// response). The provider's own wording is logged, never surfaced.
export class AiApiError extends Error {
  constructor(provider: CopywriterProvider, detail: string) {
    super(`${provider} request failed: ${detail}`);
    this.name = "AiApiError";
  }
}
