"use server";

import { headers } from "next/headers";
import { getCurrentStore } from "@/lib/tenant/current";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPublishedFormBySlug } from "@/lib/forms/query";
import { recordSubmission } from "@/lib/forms/mutate";
import { validateSubmission, HONEYPOT_FIELD } from "@/lib/forms/validate";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

export type SubmitFormState = {
  ok?: boolean;
  error?: MessageRef;
  fieldErrors?: Record<string, string>;
};

export async function submitForm(
  slug: string,
  _prev: SubmitFormState,
  formData: FormData
): Promise<SubmitFormState> {
  const store = await getCurrentStore();
  if (!store) return { error: msg("forms.errUnavailable") };

  // Silently accept and drop a bot fill (hidden field a human never sees).
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    return { ok: true };
  }

  const headerList = await headers();
  const ip = (headerList.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const limit = await checkRateLimit(`form:${store.id}:${ip}`, {
    limit: 5,
    windowSeconds: 600,
  });
  if (!limit.ok) return { error: msg("forms.errRateLimited") };

  const data = await getPublishedFormBySlug(store.id, slug);
  if (!data) return { error: msg("forms.errUnavailable") };

  const result = validateSubmission(data.fields, formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };

  try {
    await recordSubmission(store.id, data.form.id, result.ok);
  } catch {
    return { error: msg("forms.errGeneric") };
  }
  return { ok: true };
}
