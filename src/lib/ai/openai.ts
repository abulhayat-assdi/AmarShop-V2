import type { CopywriterAdapter } from "./adapter";
import { AiApiError } from "./adapter";
import type { DescribeProductInput } from "./types";
import { buildDescribePrompt } from "./prompt";

// Built against the OpenAI Chat Completions contract
// (POST {base}/chat/completions) — which OpenAI, OpenRouter, Groq,
// Together, DeepInfra, a local llama.cpp server, etc. all speak. Point
// AI_BASE_URL at the provider you want (blank = OpenAI); pick the model
// with AI_MODEL. NOT yet exercised against a live key.
type ChatResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

export class OpenAiCompatibleAdapter implements CopywriterAdapter {
  readonly provider = "openai" as const;

  constructor(
    private readonly config: { apiKey: string; baseUrl: string; model: string }
  ) {}

  async describeProduct(input: DescribeProductInput): Promise<string> {
    const { system, user } = buildDescribePrompt(input);
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 300,
          temperature: 0.7,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    } catch (err) {
      throw new AiApiError("openai", err instanceof Error ? err.message : "network error");
    }

    if (!res.ok) {
      console.error(`[ai:openai] HTTP ${res.status} from ${url}`);
      throw new AiApiError("openai", `HTTP ${res.status}`);
    }

    const data = (await res.json()) as ChatResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error(`[ai:openai] no content in response: ${data.error?.message ?? "-"}`);
      throw new AiApiError("openai", "empty response");
    }
    return text;
  }
}
