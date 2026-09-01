import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { forms, formFields, formSubmissions, type Form, type FormField } from "@/db/schema";

export type FormListItem = Form & { fieldCount: number; submissionCount: number };

export async function listFormsForAdmin(storeId: string): Promise<FormListItem[]> {
  return withStoreContext(storeId, async (tx) => {
    const rows = await tx
      .select()
      .from(forms)
      .where(eq(forms.storeId, storeId))
      .orderBy(desc(forms.updatedAt));
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const fieldCounts = await tx
      .select({ formId: formFields.formId, n: sql<number>`count(*)::int` })
      .from(formFields)
      .where(and(eq(formFields.storeId, storeId), inArray(formFields.formId, ids)))
      .groupBy(formFields.formId);
    const subCounts = await tx
      .select({ formId: formSubmissions.formId, n: sql<number>`count(*)::int` })
      .from(formSubmissions)
      .where(and(eq(formSubmissions.storeId, storeId), inArray(formSubmissions.formId, ids)))
      .groupBy(formSubmissions.formId);

    const fieldBy = new Map(fieldCounts.map((r) => [r.formId, r.n]));
    const subBy = new Map(subCounts.map((r) => [r.formId, r.n]));
    return rows.map((r) => ({
      ...r,
      fieldCount: fieldBy.get(r.id) ?? 0,
      submissionCount: subBy.get(r.id) ?? 0,
    }));
  });
}

export type FormWithFields = { form: Form; fields: FormField[] };

async function loadForm(
  storeId: string,
  where: SQL | undefined
): Promise<FormWithFields | null> {
  return withStoreContext(storeId, async (tx) => {
    const [form] = await tx.select().from(forms).where(where).limit(1);
    if (!form) return null;
    const fields = await tx
      .select()
      .from(formFields)
      .where(and(eq(formFields.storeId, storeId), eq(formFields.formId, form.id)))
      .orderBy(asc(formFields.displayOrder), asc(formFields.createdAt));
    return { form, fields };
  });
}

export async function getFormForAdmin(storeId: string, formId: string): Promise<FormWithFields | null> {
  return loadForm(storeId, and(eq(forms.storeId, storeId), eq(forms.id, formId)));
}

// Storefront read: published forms only, keyed by slug.
export async function getPublishedFormBySlug(
  storeId: string,
  slug: string
): Promise<FormWithFields | null> {
  return loadForm(
    storeId,
    and(eq(forms.storeId, storeId), eq(forms.slug, slug), eq(forms.status, "published"))
  );
}

export type SubmissionRow = {
  id: string;
  answers: { label: string; value: string }[];
  createdAt: Date;
};

export async function listSubmissions(storeId: string, formId: string): Promise<SubmissionRow[]> {
  return withStoreContext(storeId, (tx) =>
    tx
      .select({
        id: formSubmissions.id,
        answers: formSubmissions.answers,
        createdAt: formSubmissions.createdAt,
      })
      .from(formSubmissions)
      .where(and(eq(formSubmissions.storeId, storeId), eq(formSubmissions.formId, formId)))
      .orderBy(desc(formSubmissions.createdAt))
  );
}
