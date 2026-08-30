import { requireStaffSession } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";
import { ContentForm } from "../ContentForm";
import { createContent } from "../actions";

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  await requireStaffSession();
  const { kind: rawKind } = await searchParams;
  const kind = rawKind === "page" ? "page" : "post";
  const { t } = await getTranslator();
  const label = kind === "page" ? t("admin.content.addPage") : t("admin.content.addPost");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{label}</h1>
      <ContentForm kind={kind} action={createContent.bind(null, kind)} submitLabel={label} />
    </div>
  );
}
