import Link from "next/link";
import { getCurrentStore } from "@/lib/tenant/current";
import { auth } from "@/lib/auth/config";
import { signOutAction } from "./actions";

// Phase 0 placeholder. If proxy.ts resolved a store for this request's Host
// header, show it — a real storefront theme is Phase 1 (SITE_STRUCTURE.md
// Part C). Otherwise this is the platform's own root (marketing site, later).
export default async function Home() {
  const store = await getCurrentStore();

  if (store) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">Welcome to {store.name}</h1>
        <p className="text-gray-600">
          Store resolved via proxy.ts tenant resolution — slug{" "}
          <code className="rounded bg-gray-100 px-1">{store.slug}</code>, locale{" "}
          <code className="rounded bg-gray-100 px-1">{store.locale}</code>.
        </p>
      </main>
    );
  }

  const session = await auth();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">AmarShop</h1>
      <p className="text-gray-600">Multi-tenant e-commerce platform — Phase 0 foundation.</p>

      {session?.user ? (
        <div className="flex flex-col gap-2 rounded border border-green-400 bg-green-50 p-4">
          <p className="text-green-800">
            Signed in as <strong>{session.user.email}</strong> — role{" "}
            <code className="rounded bg-white px-1">{session.user.role}</code>
            {session.user.isPlatformAdmin && (
              <>
                {" "}
                (<code className="rounded bg-white px-1">platform admin</code>)
              </>
            )}
          </p>
          <form action={signOutAction}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link href="/stores/create" className="underline">
            Create a store
          </Link>
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      )}
    </main>
  );
}
