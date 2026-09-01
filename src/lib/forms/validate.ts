import type { FormField, FormAnswer } from "@/db/schema";
import { BD_PHONE_PATTERN } from "@/lib/phone";
import { parseOptions, type FormFieldType } from "./types";

// Lenient, same shape as EMAIL_PATTERN in support/actions.ts.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const HONEYPOT_FIELD = "_hp";
export function fieldInputName(fieldId: string): string {
  return `field_${fieldId}`;
}

export type SubmissionValidation =
  | { ok: FormAnswer[] }
  | { fieldErrors: Record<string, string> };

function checkValue(type: FormFieldType, value: string, options: string[]): string | null {
  switch (type) {
    case "email":
      return EMAIL_PATTERN.test(value) ? null : "forms.errEmail";
    case "phone":
      return BD_PHONE_PATTERN.test(value) ? null : "forms.errPhone";
    case "number":
      return Number.isFinite(Number(value)) ? null : "forms.errNumber";
    case "date":
      return Number.isNaN(Date.parse(value)) ? "forms.errDate" : null;
    case "dropdown":
    case "radio":
      return options.includes(value) ? null : "forms.errChoice";
    default:
      return null;
  }
}

// Server-side re-validation of a storefront submission. `formData` field
// names are fieldInputName(field.id); checkbox fields may repeat.
// Returns a per-field label/value snapshot on success (every field,
// blanks included, so the merchant sees the whole form) or a map of
// field id -> i18n error key.
export function validateSubmission(
  fields: FormField[],
  formData: FormData
): SubmissionValidation {
  const fieldErrors: Record<string, string> = {};
  const answers: FormAnswer[] = [];

  for (const field of fields) {
    const type = field.type as FormFieldType;
    const options = parseOptions(field.options);
    const raw = formData
      .getAll(fieldInputName(field.id))
      .map((v) => String(v).trim())
      .filter((v) => v !== "");

    if (field.required && raw.length === 0) {
      fieldErrors[field.id] = "forms.errRequired";
      answers.push({ label: field.label, value: "" });
      continue;
    }

    if (type === "checkbox") {
      const bad = raw.some((v) => !options.includes(v));
      if (bad) fieldErrors[field.id] = "forms.errChoice";
      answers.push({ label: field.label, value: raw.join(", ") });
      continue;
    }

    const value = raw[0] ?? "";
    if (value !== "") {
      const err = checkValue(type, value, options);
      if (err) fieldErrors[field.id] = err;
    }
    answers.push({ label: field.label, value });
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return { ok: answers };
}
