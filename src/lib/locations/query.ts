import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { bdDivisions, bdDistricts } from "@/db/schema";

export type LocationDistrict = { id: string; name: string; nameBn: string };
export type LocationDivision = {
  id: string;
  name: string;
  nameBn: string;
  districts: LocationDistrict[];
};

// Plain `db` reads, like stores — bd_divisions/bd_districts have no RLS
// policy (no store_id at all, see the schema comments), so there's no
// store context to open. Small, static reference data; no pagination.
export async function listLocations(): Promise<LocationDivision[]> {
  const [divisions, districts] = await Promise.all([
    db.select().from(bdDivisions).orderBy(asc(bdDivisions.displayOrder)),
    db.select().from(bdDistricts).orderBy(asc(bdDistricts.name)),
  ]);

  const byDivision = new Map<string, LocationDistrict[]>();
  for (const d of districts) {
    const list = byDivision.get(d.divisionId) ?? [];
    list.push({ id: d.id, name: d.name, nameBn: d.nameBn });
    byDivision.set(d.divisionId, list);
  }

  return divisions.map((div) => ({
    id: div.id,
    name: div.name,
    nameBn: div.nameBn,
    districts: byDivision.get(div.id) ?? [],
  }));
}
