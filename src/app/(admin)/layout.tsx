import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/db/client";
import { stores } from "@/db/schema";
import { signOutAction } from "@/app/actions";

// Minimal shell — enough to reach and use the admin pages. The full shell
// (global search, "View Store" link, theme toggle, notifications, pin-to-top
// favorites) is SITE_STRUCTURE.md Part B scope, deferred to a later slice.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Direct lookup by the session's own storeId — not getCurrentStore()
  // (that's proxy.ts's host-based resolution for the public storefront).
  // stores isn't RLS-scoped (see src/db/schema/stores.ts), so a plain
  // select is correct here, same as src/lib/tenant/current.ts.
  const [store] = await db.select().from(stores).where(eq(stores.id, session.user.storeId)).limit(1);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col gap-6 border-r p-4">
        <Link href="/dashboard" className="font-semibold">
          {store?.name ?? "AmarShop"}
        </Link>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/dashboard" className="underline">
            Dashboard
          </Link>
          <Link href="/orders" className="underline">
            Orders
          </Link>
          <Link href="/products" className="underline">
            Products
          </Link>
          <Link href="/categories" className="underline">
            Categories
          </Link>
          <Link href="/delivery-zones" className="underline">
            Delivery Zones
          </Link>
        </nav>
        <form action={signOutAction} className="mt-auto">
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
