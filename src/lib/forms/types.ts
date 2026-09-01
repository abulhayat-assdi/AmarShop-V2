// Client-safe: the form-field-type catalogue + small shared helpers,
// mirrors formFieldTypeEnum (src/db/schema/enums.ts). Imported by the
// admin field editor, the storefront renderer and the server validator,
// so it carries zero server-only imports.

export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "textarea",
  "dropdown",
  "radio",
  "checkbox",
  "number",
  "date",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

// Types whose choices come from form_fields.options (one per line).
export const FIELD_TYPES_WITH_OPTIONS: readonly FormFieldType[] = ["dropdown", "radio", "checkbox"];

// checkbox is the only type that accepts more than one value at once.
export const MULTI_VALUE_TYPES: readonly FormFieldType[] = ["checkbox"];

export function fieldTypeHasOptions(type: FormFieldType): boolean {
  return FIELD_TYPES_WITH_OPTIONS.includes(type);
}

export function isFormFieldType(v: string): v is FormFieldType {
  return (FORM_FIELD_TYPES as readonly string[]).includes(v);
}

// The i18n key for a type's display name — admin.forms.type.<type>.
export function fieldTypeLabelKey(type: FormFieldType): string {
  return `admin.forms.type.${type}`;
}

// options text -> trimmed, de-duped, non-empty lines.
export function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

// Max fields per form / max submissions kept per form are enforced in
// src/lib/forms/mutate.ts, not the schema.
export const MAX_FIELDS_PER_FORM = 40;
