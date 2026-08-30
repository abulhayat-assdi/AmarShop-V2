import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { resolveLocale } from "@/lib/i18n/server";
import { storefrontUrlFor } from "@/lib/tenant/resolve";
import { getStockAlerts, DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/products/stock";
import { AdminShell, type AdminNavItem } from "@/components/admin-shell";

const NAV: AdminNavItem[] = [
  { href: "/dashboard", labelKey: "admin.nav.dashboard" },
  { href: "/orders", labelKey: "admin.nav.orders" },
  { href: "/abandoned-checkouts", labelKey: "admin.nav.abandonedCheckouts" },
  { href: "/products", labelKey: "admin.nav.products" },
  { href: "/categories", labelKey: "admin.nav.categories" },
  { href: "/coupons", labelKey: "admin.nav.coupons" },
  { href: "/staff", labelKey: "admin.nav.staff" },
  { href: "/delivery-zones", labelKey: "admin.nav.deliveryZones" },
  { href: "/courier-settings", labelKey: "admin.nav.courierSettings" },
  { href: "/payment-settings", labelKey: "admin.nav.paymentSettings" },
  { href: "/sms-settings", labelKey: "admin.nav.smsSettings" },
  { href: "/marketing-settings", labelKey: "admin.nav.marketingSettings" },
  { href: "/domain-settings", labelKey: "admin.nav.domainSettings" },
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
  const { alerts, total } = await getStockAlerts(
    session.user.storeId,
    store?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
  );

  return (
    <AdminShell
      storeName={store?.name ?? "AmarShop"}
      storefrontUrl={store ? storefrontUrlFor(store) : null}
      user={{
        name: session.user.name ?? session.user.email ?? "Staff",
        role: session.user.role,
        isPlatformAdmin: session.user.isPlatformAdmin,
      }}
      nav={NAV}
      locale={locale}
      stockAlerts={alerts}
      stockAlertTotal={total}
    >
      {children}
    </AdminShell>
  );
}
