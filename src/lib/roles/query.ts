import { asc, eq, sql } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { customRoles, staffMembers, type CustomRole } from "@/db/schema";

export type CustomRoleWithCount = CustomRole & { staffCount: number };

export async function listCustomRoles(storeId: string): Promise<CustomRoleWithCount[]> {
  return withStoreContext(storeId, async (tx) => {
    const roles = await tx
      .select()
      .from(customRoles)
      .where(eq(customRoles.storeId, storeId))
      .orderBy(asc(customRoles.name));

    const counts = await tx
      .select({
        customRoleId: staffMembers.customRoleId,
        count: sql<number>`count(*)::int`,
      })
      .from(staffMembers)
      .where(eq(staffMembers.storeId, storeId))
      .groupBy(staffMembers.customRoleId);
    const countByRole = new Map(counts.map((c) => [c.customRoleId, c.count]));

    return roles.map((r) => ({ ...r, staffCount: countByRole.get(r.id) ?? 0 }));
  });
}
