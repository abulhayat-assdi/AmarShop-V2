import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth/roles";
import { getTranslator } from "@/lib/i18n/server";

// Wraps every /platform/* page. One gate for the whole platform-operator
// area (individual pages keep their own requirePlatformAdminPage() too).
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdminPage();
  const { t } = await getTranslator();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center gap-4 border-b pb-3">
        <span className="text-lg font-semibold">AmarShop</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/platform" className="hover:underline">
            {t("platform.nav.dashboard")}
          </Link>
          <Link href="/platform/billing" className="hover:underline">
            {t("platform.nav.billing")}
          </Link>
          <Link href="/platform/apps" className="hover:underline">
            {t("platform.nav.apps")}
          </Link>
          {/* English-only, like /stores/create — operator surfaces. */}
          <Link href="/platform/blog" className="hover:underline">
            Blog
          </Link>
          <Link href="/platform/testimonials" className="hover:underline">
            Testimonials
          </Link>
          <Link href="/stores/create" className="hover:underline">
            {t("platform.nav.createStore")}
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
