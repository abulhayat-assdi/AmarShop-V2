import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { staffMembers } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { STAFF_ROLE_KEYS } from "@/lib/enum-labels";
import { AccountForm } from "./AccountForm";

export default async function AccountPage() {
  const session = await requireStaffSession();
  const email = (session.user.email ?? "").toLowerCase();
  const { t } = await getTranslator();

  const [me] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.email, email)))
      .limit(1)
  );
  if (!me) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.account.title")}</h1>
      <AccountForm name={me.name} email={me.email} roleLabel={t(STAFF_ROLE_KEYS[me.role])} />
    </div>
  );
}
