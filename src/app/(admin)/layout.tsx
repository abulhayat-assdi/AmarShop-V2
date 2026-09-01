import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { getStaffPermissions } from "@/lib/auth/roles";
import { NAV_PERMISSION } from "@/lib/auth/permissions";
import { db } from "@/db/client";
import { withStoreContext } from "@/db/context";
import { stores, staffMembers } from "@/db/schema";
import { resolveLocale, getTranslator } from "@/lib/i18n/server";
import { storefrontUrlFor } from "@/lib/tenant/resolve";
import { getStockAlerts, DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/products/stock";
import { getUnreadNotices } from "@/lib/notices/query";
import { AdminShell, type AdminNavItem } from "@/components/admin-shell";

const NAV: AdminNavItem[] = [
  { href: "/dashboard", labelKey: "admin.nav.dashboard" },
  { href: "/orders", labelKey: "admin.nav.orders" },
  { href: "/abandoned-checkouts", labelKey: "admin.nav.abandonedCheckouts" },
  { href: "/products", labelKey: "admin.nav.products" },
  { href: "/categories", labelKey: "admin.nav.categories" },
  { href: "/coupons", labelKey: "admin.nav.coupons" },
  { href: "/content", labelKey: "admin.nav.content" },
  { href: "/staff", labelKey: "admin.nav.staff" },
  { href: "/roles", labelKey: "admin.nav.roles" },
  { href: "/delivery-zones", labelKey: "admin.nav.deliveryZones" },
  { href: "/courier-settings", labelKey: "admin.nav.courierSettings" },
  { href: "/payment-settings", labelKey: "admin.nav.paymentSettings" },
  { href: "/sms-settings", labelKey: "admin.nav.smsSettings" },
  { href: "/marketing-settings", labelKey: "admin.nav.marketingSettings" },
  { href: "/appearance", labelKey: "admin.nav.appearance" },
  { href: "/menu-builder", labelKey: "admin.nav.menuBuilder" },
  { href: "/shop-preview", labelKey: "admin.nav.shopPreview" },
  { href: "/checkout-settings", labelKey: "admin.nav.checkoutSettings" },
  { href: "/default-pages", labelKey: "admin.nav.defaultPages" },
  { href: "/domain-settings", labelKey: "admin.nav.domainSettings" },
  { href: "/api-keys", labelKey: "admin.nav.apiKeys" },
  { href: "/installed-apps", labelKey: "admin.nav.installedApps" },
  { href: "/webhooks", labelKey: "admin.nav.webhooks" },
  { href: "/billing", labelKey: "admin.nav.billing" },
  { href: "/support", labelKey: "admin.nav.support" },
  { href: "/notices", labelKey: "admin.nav.notices" },
  { href: "/guest-checkout", labelKey: "admin.nav.guestCheckout" },
  { href: "/locations", labelKey: "admin.nav.locations" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Direct lookup by the session's own storeId — not getCurrentStore()
  // (that's proxy.ts's host-based resolution for the public storefront).
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, session.user.storeId))
    .limit(1);

  const locale = await resolveLocale();
  const { t } = await getTranslator();
  const { alerts, total } = await getStockAlerts(
    session.user.storeId,
    store?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
  );
  const [me] = await withStoreContext(session.user.storeId, (tx) =>
    tx
      .select({ notifyBillingNotices: staffMembers.notifyBillingNotices })
      .from(staffMembers)
      .where(
        and(
          eq(staffMembers.storeId, session.user.storeId),
          eq(staffMembers.email, (session.user.email ?? "").toLowerCase())
        )
      )
      .limit(1)
  );
  const { notices, total: noticeTotal } = await getUnreadNotices(session.user.storeId, {
    hideBilling: me?.notifyBillingNotices === false,
  });

  // owner/admin always see the full nav (requirePermission() gives them
  // unconditional access on every page anyway); a "staff" viewer only sees
  // what their assigned custom role actually grants — a UI nicety on top
  // of the real enforcement, which is still each page's own
  // requirePermission() call (src/lib/auth/roles.ts).
  let visibleNav = NAV;
  if (session.user.role === "staff") {
    const granted = await getStaffPermissions(
      session.user.storeId,
      (session.user.email ?? "").toLowerCase()
    );
    visibleNav = NAV.filter((item) => {
      const needed = NAV_PERMISSION[item.href];
      return !needed || granted.includes(needed);
    });
  }

  return (
    <AdminShell
      storeName={store?.name ?? "AmarShop"}
      storefrontUrl={store ? storefrontUrlFor(store) : null}
      user={{
        name: session.user.name ?? session.user.email ?? "Staff",
        role: session.user.role,
        isPlatformAdmin: session.user.isPlatformAdmin,
      }}
      nav={visibleNav}
      locale={locale}
      stockAlerts={alerts}
      stockAlertTotal={total}
      notices={notices}
      noticeTotal={noticeTotal}
    >
      {store && store.status !== "active" && (
        <div className="mb-4 rounded border border-red-500 bg-red-600 px-4 py-2 text-sm text-white">
          {t("admin.shell.suspendedNotice")}{" "}
          <Link href="/billing" className="font-semibold underline">
            {t("admin.nav.billing")}
          </Link>
        </div>
      )}
      {store && store.status === "active" && store.subscriptionStatus === "past_due" && (
        <div className="mb-4 rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {t("admin.shell.pastDueNotice")}{" "}
          <Link href="/billing" className="font-semibold underline">
            {t("admin.nav.billing")}
          </Link>
        </div>
      )}
      {children}
    </AdminShell>
  );
}
