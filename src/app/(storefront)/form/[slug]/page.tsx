import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { getPublishedFormBySlug } from "@/lib/forms/query";
import { PublicForm } from "./PublicForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (!store) return {};
  const data = await getPublishedFormBySlug(store.id, slug);
  if (!data) return {};
  return { title: `${data.form.title} — ${store.name}` };
}

export default async function StorefrontFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getCurrentStore();
  if (!store) notFound();

  const data = await getPublishedFormBySlug(store.id, slug);
  if (!data) notFound();
  const { form, fields } = data;

  return (
    <article className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-semibold">{form.title}</h1>
      {form.description && (
        <p className="whitespace-pre-wrap text-sm text-gray-600">{form.description}</p>
      )}
      <PublicForm slug={slug} fields={fields} successMessage={form.successMessage} />
    </article>
  );
}
