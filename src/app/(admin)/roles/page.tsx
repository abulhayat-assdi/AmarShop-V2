import { requirePermission } from "@/lib/auth/roles";
import { listCustomRoles } from "@/lib/roles/query";
import { parsePermissions } from "@/lib/auth/permissions";
import { getTranslator } from "@/lib/i18n/server";
import { RoleForm } from "./RoleForm";
import { deleteRoleAction } from "./actions";

export default async function RolesPage() {
  const session = await requirePermission("staff:manage");
  const roles = await listCustomRoles(session.user.storeId);
  const { t } = await getTranslator();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.roles.title")}</h1>
      <p className="text-sm text-gray-600">{t("admin.roles.intro")}</p>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.roles.createTitle")}</h2>
        <RoleForm />
      </section>

      {roles.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-medium">{t("admin.roles.existingTitle")}</h2>
          {roles.map((r) => (
            <div key={r.id} className="flex flex-col gap-2">
              <RoleForm role={{ id: r.id, name: r.name, permissions: parsePermissions(r.permissions) }} />
              <div className="flex items-center justify-between px-1 text-xs text-gray-500">
                <span>{t("admin.roles.assignedCount", { count: r.staffCount })}</span>
                <form action={deleteRoleAction}>
                  <input type="hidden" name="roleId" value={r.id} />
                  <button type="submit" className="text-red-600 underline">
                    {t("admin.common.delete")}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
