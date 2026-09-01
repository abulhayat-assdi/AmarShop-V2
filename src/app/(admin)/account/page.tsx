import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffSession } from "@/lib/auth/roles";
import { withStoreContext } from "@/db/context";
import { db } from "@/db/client";
import { staffMembers, stores } from "@/db/schema";
import { getTranslator } from "@/lib/i18n/server";
import { STAFF_ROLE_KEYS } from "@/lib/enum-labels";
import { ACCOUNT_TABS, ACCOUNT_TAB_LABEL_KEYS, isAccountTab } from "./tabs";
import { ProfileTab } from "./ProfileTab";
import { AppearanceTab } from "./AppearanceTab";
import { NotificationsTab } from "./NotificationsTab";
import { SecurityTab } from "./SecurityTab";
import { CompanyTab } from "./CompanyTab";
import { SystemTab } from "./SystemTab";
import packageJson from "../../../../package.json";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireStaffSession();
  const email = (session.user.email ?? "").toLowerCase();
  const { t } = await getTranslator();
  const tabParam = (await searchParams).tab;
  const tab = isAccountTab(tabParam) ? tabParam : "profile";

  const [me] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select()
      .from(staffMembers)
      .where(and(eq(staffMembers.storeId, session.user.storeId), eq(staffMembers.email, email)))
      .limit(1)
  );
  if (!me) notFound();

  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);
  if (!store) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("admin.account.title")}</h1>

      <div className="flex gap-1 border-b text-sm">
        {ACCOUNT_TABS.map((id) => (
          <Link
            key={id}
            href={`/account?tab=${id}`}
            className={`-mb-px border-b-2 px-3 py-2 ${
              tab === id ? "border-black font-medium" : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {t(ACCOUNT_TAB_LABEL_KEYS[id])}
          </Link>
        ))}
      </div>

      {tab === "profile" && (
        <ProfileTab
          name={me.name}
          email={me.email}
          phone={me.phone}
          bio={me.bio}
          roleLabel={t(STAFF_ROLE_KEYS[me.role])}
        />
      )}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "notifications" && (
        <NotificationsTab notifyBillingNotices={me.notifyBillingNotices} />
      )}
      {tab === "security" && <SecurityTab />}
      {tab === "company" && (
        <CompanyTab
          name={store.name}
          businessAddress={store.businessAddress}
          timezone={store.timezone}
          currency={store.currency}
        />
      )}
      {tab === "system" && (
        <SystemTab
          appVersion={packageJson.version}
          storeName={store.name}
          maintenanceMode={store.maintenanceMode}
          isOwner={session.user.role === "owner"}
          deletionRequestedAt={store.deletionRequestedAt}
        />
      )}
    </div>
  );
}
