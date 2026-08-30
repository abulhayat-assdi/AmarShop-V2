import type { CopywriterAdapter } from "./adapter";
import { OpenAiCompatibleAdapter } from "./openai";
import { AnthropicAdapter } from "./anthropic";
import { StubAdapter } from "./stub";

export type { CopywriterAdapter } from "./adapter";
export { AiApiError, AiNotConfiguredError } from "./adapter";
export type { CopywriterProvider, DescribeProductInput } from "./types";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

// The single construction site (CLAUDE.md rule #5). Provider-agnostic:
//   AI_PROVIDER = openai   -> any OpenAI-compatible endpoint (OpenAI,
//                             OpenRouter, Groq, Together, local, ...),
//                             AI_BASE_URL selects which
//   AI_PROVIDER = anthropic-> Anthropic Messages API
//   anything else / unset  -> StubAdapter (offline canned text)
export function createCopywriterAdapter(): CopywriterAdapter {
  const provider = process.env.AI_PROVIDER;
  const apiKey = process.env.AI_API_KEY;

  if (provider === "openai" && apiKey) {
    return new OpenAiCompatibleAdapter({
      apiKey,
      baseUrl: process.env.AI_BASE_URL || DEFAULT_OPENAI_BASE_URL,
      model: process.env.AI_MODEL || DEFAULT_OPENAI_MODEL,
    });
  }

  if (provider === "anthropic" && apiKey) {
    return new AnthropicAdapter({
      apiKey,
      model: process.env.AI_MODEL || DEFAULT_ANTHROPIC_MODEL,
    });
  }

  return new StubAdapter();
}
