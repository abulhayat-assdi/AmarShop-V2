import Link from "next/link";
import { eq } from "drizzle-orm";
import { canManageStaffRow, requireRole } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { staffMembers } from "@/db/schema";
import { checkPlanLimit } from "@/lib/billing/limits";
import { getTranslator } from "@/lib/i18n/server";
import { STAFF_ROLE_KEYS } from "@/lib/enum-labels";
import { StaffForm } from "./StaffForm";
import { StaffRow } from "./StaffRow";

export default async function StaffPage() {
  const session = await requireRole("admin");
  const { t } = await getTranslator();
  const actorIsOwner = session.user.role === "owner";
  const myEmail = (session.user.email ?? "").toLowerCase();

  const rows = await withStoreContext(session.user.storeId, (tx) =>
    tx.select().from(staffMembers).where(eq(staffMembers.storeId, session.user.storeId))
  );

  const planLimit = await checkPlanLimit(session.user.storeId, "staff", 0);
  const atStaffLimit =
    !planLimit.ok || (planLimit.limit !== null && planLimit.used >= planLimit.limit);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.staff.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.staff.roleChangeNote")}</p>

      {atStaffLimit && planLimit.limit !== null && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("billing.staffLimitReached", { used: planLimit.used, limit: planLimit.limit })}{" "}
          <Link href="/billing" className="underline">
            {t("admin.nav.billing")}
          </Link>
        </p>
      )}

      <StaffForm actorIsOwner={actorIsOwner} />

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t("admin.staff.colName")}</th>
            <th className="py-2">{t("admin.staff.colEmail")}</th>
            <th className="py-2">{t("admin.staff.colRole")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelf = row.email.toLowerCase() === myEmail;
            const editable = !isSelf && canManageStaffRow(session.user.role, row.role);
            return (
              <tr key={row.id} className="border-b align-top">
                <td className="py-2">
                  {row.name}
                  {isSelf && (
                    <span className="ml-2 text-xs text-gray-400">{t("admin.staff.youTag")}</span>
                  )}
                </td>
                <td className="py-2">{row.email}</td>
                <td className="py-2">
                  {editable ? (
                    <StaffRow staffId={row.id} role={row.role} actorIsOwner={actorIsOwner} />
                  ) : (
                    t(STAFF_ROLE_KEYS[row.role])
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
