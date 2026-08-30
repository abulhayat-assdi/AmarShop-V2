import type { CopywriterAdapter } from "./adapter";
import { AiApiError } from "./adapter";
import type { DescribeProductInput } from "./types";
import { buildDescribePrompt } from "./prompt";

// Built against Anthropic's Messages API contract
// (POST https://api.anthropic.com/v1/messages) — NOT yet exercised
// against a live key. Model via AI_MODEL (e.g. claude-haiku-4-5).
const ENDPOINT = "https://api.anthropic.com/v1/messages";

type MessagesResponse = {
  content?: { type?: string; text?: string }[];
  error?: { message?: string };
};

export class AnthropicAdapter implements CopywriterAdapter {
  readonly provider = "anthropic" as const;

  constructor(private readonly config: { apiKey: string; model: string }) {}

  async describeProduct(input: DescribeProductInput): Promise<string> {
    const { system, user } = buildDescribePrompt(input);

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 300,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
    } catch (err) {
      throw new AiApiError("anthropic", err instanceof Error ? err.message : "network error");
    }

    if (!res.ok) {
      console.error(`[ai:anthropic] HTTP ${res.status}`);
      throw new AiApiError("anthropic", `HTTP ${res.status}`);
    }

    const data = (await res.json()) as MessagesResponse;
    const text = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text) {
      console.error(`[ai:anthropic] no text in response: ${data.error?.message ?? "-"}`);
      throw new AiApiError("anthropic", "empty response");
    }
    return text;
  }
}
