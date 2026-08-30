"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { requireStaffSession } from "@/lib/auth/roles";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { categories, stores } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { isLocale } from "@/lib/i18n/config";
import type { DescribeProductInput } from "@/lib/ai/types";
import { generateProductDescription, generateProductSeo } from "@/lib/ai/describe";

export type AiDescState = { text?: string; error?: string };
export type AiSeoState = { title?: string; metaDescription?: string; error?: string };

// Shared prep for both AI buttons on the product form: auth, the
// name-required gate, a per-store+IP rate limit, and building the
// DescribeProductInput from the current form fields + the store's locale.
async function prepareInput(
  formData: FormData,
  rateKind: string
): Promise<{ ok: true; storeId: string; input: DescribeProductInput } | { ok: false; error: string }> {
  const session = await requireStaffSession();
  const { storeId } = session.user;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "admin.products.aiErrNoName" };

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const limit = await checkRateLimit(`ai:${rateKind}:${storeId}:${ip}`, {
    limit: 20,
    windowSeconds: 300,
  });
  if (!limit.ok) return { ok: false, error: "admin.products.aiErrRateLimited" };

  const brand = String(formData.get("brand") ?? "").trim() || null;
  const rawPrice = Number(String(formData.get("price") ?? "").trim());
  const priceBdt = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  const [storeRow] = await db
    .select({ locale: stores.locale })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  const locale = isLocale(storeRow?.locale) ? storeRow.locale : "bn";

  let category: string | null = null;
  if (categoryId) {
    const [row] = await withStoreContext(storeId, (tx) =>
      tx
        .select({ name: categories.name })
        .from(categories)
        .where(and(eq(categories.storeId, storeId), eq(categories.id, categoryId)))
        .limit(1)
    );
    category = row?.name ?? null;
  }

  return { ok: true, storeId, input: { name, category, brand, priceBdt, locale } };
}

export async function generateDescriptionAction(
  _prev: AiDescState,
  formData: FormData
): Promise<AiDescState> {
  const prep = await prepareInput(formData, "desc");
  if (!prep.ok) return { error: prep.error };

  const result = await generateProductDescription(prep.input);
  if (!result.ok) {
    return {
      error:
        result.reason === "not_configured"
          ? "admin.products.aiErrNotConfigured"
          : "admin.products.aiErrGeneric",
    };
  }
  return { text: result.text };
}

export async function generateSeoAction(
  _prev: AiSeoState,
  formData: FormData
): Promise<AiSeoState> {
  const prep = await prepareInput(formData, "seo");
  if (!prep.ok) return { error: prep.error };

  const result = await generateProductSeo(prep.input);
  if (!result.ok) {
    return {
      error:
        result.reason === "not_configured"
          ? "admin.products.aiErrNotConfigured"
          : "admin.products.aiErrGeneric",
    };
  }
  return { title: result.seo.title, metaDescription: result.seo.metaDescription };
}
