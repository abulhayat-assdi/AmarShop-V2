"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import {
  addField,
  createForm,
  deleteField,
  deleteForm,
  updateField,
  updateForm,
} from "@/lib/forms/mutate";

// Forms is in SITE_STRUCTURE.md's "Content" group next to Blog — it reuses
// the existing content:manage permission (owner/admin unconditional).
export type FormActionState = { error?: string; ok?: boolean };

export async function createFormAction(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await requirePermission("content:manage");
  const result = await createForm(session.user.storeId, {
    title: String(formData.get("title") ?? ""),
    slugInput: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    successMessage: String(formData.get("successMessage") ?? ""),
    status: formData.get("status") === "published" ? "published" : "draft",
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/forms");
  redirect(`/forms/${result.id}/edit`);
}

export async function updateFormAction(
  formId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await requirePermission("content:manage");
  const result = await updateForm(session.user.storeId, formId, {
    title: String(formData.get("title") ?? ""),
    slugInput: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    successMessage: String(formData.get("successMessage") ?? ""),
    status: formData.get("status") === "published" ? "published" : "draft",
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/forms");
  revalidatePath(`/forms/${formId}/edit`);
  return { ok: true };
}

export async function deleteFormAction(formId: string): Promise<void> {
  const session = await requirePermission("content:manage");
  await deleteForm(session.user.storeId, formId);
  revalidatePath("/forms");
  redirect("/forms");
}

export async function addFieldAction(
  formId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await requirePermission("content:manage");
  const result = await addField(session.user.storeId, formId, {
    type: String(formData.get("type") ?? ""),
    label: String(formData.get("label") ?? ""),
    placeholder: String(formData.get("placeholder") ?? ""),
    required: formData.get("required") != null,
    options: String(formData.get("options") ?? ""),
    displayOrder: Number(formData.get("displayOrder") ?? 0),
  });
  if ("error" in result) return { error: result.error };
  revalidatePath(`/forms/${formId}/edit`);
  return { ok: true };
}

export async function updateFieldAction(
  formId: string,
  fieldId: string,
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const session = await requirePermission("content:manage");
  const result = await updateField(session.user.storeId, fieldId, {
    type: String(formData.get("type") ?? ""),
    label: String(formData.get("label") ?? ""),
    placeholder: String(formData.get("placeholder") ?? ""),
    required: formData.get("required") != null,
    options: String(formData.get("options") ?? ""),
    displayOrder: Number(formData.get("displayOrder") ?? 0),
  });
  if ("error" in result) return { error: result.error };
  revalidatePath(`/forms/${formId}/edit`);
  return { ok: true };
}

export async function deleteFieldAction(formId: string, fieldId: string): Promise<void> {
  const session = await requirePermission("content:manage");
  await deleteField(session.user.storeId, fieldId);
  revalidatePath(`/forms/${formId}/edit`);
}
