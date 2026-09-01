import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { getFormForAdmin, listSubmissions } from "@/lib/forms/query";

export default async function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePermission("content:manage");
  const { t, locale } = await getTranslator();

  const data = await getFormForAdmin(session.user.storeId, id);
  if (!data) notFound();

  const submissions = await listSubmissions(session.user.storeId, id);
  const dateFmt = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{data.form.title}</h1>
        <Link href={`/forms/${id}/edit`} className="text-sm underline">
          {t("admin.forms.backToForm")}
        </Link>
      </div>
      <p className="text-sm text-gray-600">
        {t("admin.forms.submissionCount", { n: submissions.length })}
      </p>

      {submissions.length === 0 ? (
        <p className="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-500">
          {t("admin.forms.noSubmissions")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((s) => (
            <li key={s.id} className="rounded border p-3 text-sm">
              <div className="mb-2 text-xs text-gray-500">{dateFmt.format(s.createdAt)}</div>
              <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1">
                {s.answers.map((a, i) => (
                  <div key={i} className="contents">
                    <dt className="text-gray-500">{a.label}</dt>
                    <dd className="whitespace-pre-wrap">{a.value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
