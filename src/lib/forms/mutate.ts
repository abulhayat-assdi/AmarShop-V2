import { and, eq, ne, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { forms, formFields, formSubmissions } from "@/db/schema";
import type { FormAnswer } from "@/db/schema";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { fieldTypeHasOptions, isFormFieldType, MAX_FIELDS_PER_FORM, parseOptions } from "./types";

export type MutateResult = { ok: true; id: string } | { error: string };

type FormMeta = {
  title: string;
  slugInput?: string;
  description?: string;
  successMessage?: string;
  status?: "draft" | "published";
};

function cleanMeta(input: FormMeta) {
  return {
    title: input.title.trim(),
    slugInput: (input.slugInput ?? "").trim(),
    description: (input.description ?? "").trim() || null,
    successMessage: (input.successMessage ?? "").trim() || null,
    status: input.status === "published" ? ("published" as const) : ("draft" as const),
  };
}

export async function createForm(storeId: string, input: FormMeta): Promise<MutateResult> {
  const meta = cleanMeta(input);
  if (!meta.title) return { error: "admin.forms.errTitle" };

  return withStoreContext(storeId, async (tx) => {
    const slug = await uniqueSlug(meta.slugInput || meta.title, async (candidate) => {
      const [hit] = await tx
        .select({ id: forms.id })
        .from(forms)
        .where(and(eq(forms.storeId, storeId), eq(forms.slug, candidate)))
        .limit(1);
      return Boolean(hit);
    });

    const [row] = await tx
      .insert(forms)
      .values({
        storeId,
        title: meta.title,
        slug,
        description: meta.description,
        successMessage: meta.successMessage,
        status: meta.status,
      })
      .returning({ id: forms.id });
    return { ok: true, id: row.id };
  });
}

export async function updateForm(
  storeId: string,
  formId: string,
  input: FormMeta
): Promise<MutateResult> {
  const meta = cleanMeta(input);
  if (!meta.title) return { error: "admin.forms.errTitle" };

  return withStoreContext(storeId, async (tx) => {
    const [current] = await tx
      .select({ slug: forms.slug })
      .from(forms)
      .where(and(eq(forms.storeId, storeId), eq(forms.id, formId)))
      .limit(1);
    if (!current) return { error: "admin.forms.errNotFound" };

    const desired = slugify(meta.slugInput || meta.title) || "form";
    let slug = current.slug;
    if (desired !== current.slug) {
      slug = await uniqueSlug(desired, async (candidate) => {
        const [hit] = await tx
          .select({ id: forms.id })
          .from(forms)
          .where(
            and(
              eq(forms.storeId, storeId),
              eq(forms.slug, candidate),
              ne(forms.id, formId)
            )
          )
          .limit(1);
        return Boolean(hit);
      });
    }

    await tx
      .update(forms)
      .set({
        title: meta.title,
        slug,
        description: meta.description,
        successMessage: meta.successMessage,
        status: meta.status,
        updatedAt: new Date(),
      })
      .where(and(eq(forms.storeId, storeId), eq(forms.id, formId)));
    return { ok: true, id: formId };
  });
}

export async function deleteForm(storeId: string, formId: string): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx.delete(forms).where(and(eq(forms.storeId, storeId), eq(forms.id, formId)))
  );
}

type FieldInput = {
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string;
  displayOrder?: number;
};

function cleanField(input: FieldInput) {
  const type = isFormFieldType(input.type) ? input.type : null;
  const label = input.label.trim();
  const withOptions = type ? fieldTypeHasOptions(type) : false;
  const options = withOptions ? parseOptions(input.options).join("\n") || null : null;
  return {
    type,
    label,
    placeholder: (input.placeholder ?? "").trim() || null,
    required: Boolean(input.required),
    options,
    displayOrder: Number.isInteger(input.displayOrder) ? Number(input.displayOrder) : 0,
    withOptions,
  };
}

export async function addField(
  storeId: string,
  formId: string,
  input: FieldInput
): Promise<MutateResult> {
  const f = cleanField(input);
  const type = f.type;
  if (!type) return { error: "admin.forms.errFieldType" };
  if (!f.label) return { error: "admin.forms.errFieldLabel" };
  if (f.withOptions && !f.options) return { error: "admin.forms.errFieldOptions" };

  return withStoreContext(storeId, async (tx) => {
    const [form] = await tx
      .select({ id: forms.id })
      .from(forms)
      .where(and(eq(forms.storeId, storeId), eq(forms.id, formId)))
      .limit(1);
    if (!form) return { error: "admin.forms.errNotFound" };

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(formFields)
      .where(and(eq(formFields.storeId, storeId), eq(formFields.formId, formId)));
    if (count >= MAX_FIELDS_PER_FORM) return { error: "admin.forms.errTooManyFields" };

    const [row] = await tx
      .insert(formFields)
      .values({
        storeId,
        formId,
        type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options,
        displayOrder: f.displayOrder,
      })
      .returning({ id: formFields.id });
    return { ok: true, id: row.id };
  });
}

export async function updateField(
  storeId: string,
  fieldId: string,
  input: FieldInput
): Promise<MutateResult> {
  const f = cleanField(input);
  const type = f.type;
  if (!type) return { error: "admin.forms.errFieldType" };
  if (!f.label) return { error: "admin.forms.errFieldLabel" };
  if (f.withOptions && !f.options) return { error: "admin.forms.errFieldOptions" };

  await withStoreContext(storeId, (tx) =>
    tx
      .update(formFields)
      .set({
        type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options,
        displayOrder: f.displayOrder,
        updatedAt: new Date(),
      })
      .where(and(eq(formFields.storeId, storeId), eq(formFields.id, fieldId)))
  );
  return { ok: true, id: fieldId };
}

export async function deleteField(storeId: string, fieldId: string): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx.delete(formFields).where(and(eq(formFields.storeId, storeId), eq(formFields.id, fieldId)))
  );
}

export async function recordSubmission(
  storeId: string,
  formId: string,
  answers: FormAnswer[]
): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx.insert(formSubmissions).values({ storeId, formId, answers })
  );
}
