import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { getTranslator } from "@/lib/i18n/server";
import { TrackForm } from "./TrackForm";

export default async function TrackPage() {
  const store = await getCurrentStore();
  if (!store) notFound();
  const { t } = await getTranslator(store.locale);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("track.title")}</h1>
      <p className="text-sm text-gray-600">{t("track.intro")}</p>
      <TrackForm />
    </div>
  );
}
