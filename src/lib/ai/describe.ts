import { createCopywriterAdapter, AiNotConfiguredError } from "./index";
import type { DescribeProductInput, SeoResult } from "./types";

const MAX_LEN = 800;

type FailReason = "not_configured" | "failed";

export type DescribeResult = { ok: true; text: string } | { ok: false; reason: FailReason };
export type SeoGenResult = { ok: true; seo: SeoResult } | { ok: false; reason: FailReason };

// Thin never-throws wrapper (mirrors src/lib/sms/notifications.ts). The
// caller — src/app/(admin)/products/ai-actions.ts — turns the reason into
// a translated message.
export async function generateProductDescription(
  input: DescribeProductInput
): Promise<DescribeResult> {
  try {
    const adapter = createCopywriterAdapter();
    const text = (await adapter.describeProduct(input)).trim().slice(0, MAX_LEN);
    if (!text) return { ok: false, reason: "failed" };
    return { ok: true, text };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, reason: "not_configured" };
    console.error("[ai:describe] generation failed", err);
    return { ok: false, reason: "failed" };
  }
}

export async function generateProductSeo(input: DescribeProductInput): Promise<SeoGenResult> {
  try {
    const seo = await createCopywriterAdapter().generateSeo(input);
    if (!seo.title.trim() && !seo.metaDescription.trim()) return { ok: false, reason: "failed" };
    return { ok: true, seo };
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return { ok: false, reason: "not_configured" };
    console.error("[ai:seo] generation failed", err);
    return { ok: false, reason: "failed" };
  }
}
