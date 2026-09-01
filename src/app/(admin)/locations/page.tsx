import { requireStaffSession } from "@/lib/auth/roles";
import { listLocations } from "@/lib/locations/query";
import { getTranslator } from "@/lib/i18n/server";

export default async function LocationsPage() {
  await requireStaffSession();
  const divisions = await listLocations();
  const { t, locale } = await getTranslator();
  const districtTotal = divisions.reduce((sum, d) => sum + d.districts.length, 0);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.locations.title")}</h1>
      <p className="text-sm text-gray-600">
        {t("admin.locations.intro", { divisions: divisions.length, districts: districtTotal })}
      </p>

      <div className="flex flex-col gap-5">
        {divisions.map((div) => (
          <div key={div.id} className="rounded border p-4">
            <h2 className="mb-2 font-semibold">{locale === "bn" ? div.nameBn : div.name}</h2>
            <div className="flex flex-wrap gap-2">
              {div.districts.map((dist) => (
                <span
                  key={dist.id}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700"
                >
                  {locale === "bn" ? dist.nameBn : dist.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
