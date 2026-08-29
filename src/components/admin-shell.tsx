"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { LocaleToggle } from "@/components/locale-toggle";
import { useTranslator } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/config";
import { STAFF_ROLE_KEYS } from "@/lib/enum-labels";
import type { StaffMember } from "@/db/schema";

export type AdminNavItem = { href: string; labelKey: string };

const PIN_KEY = "amarshop_admin_pins";
const PIN_EVENT = "amarshop-admin-pins";

// Pinned nav items are a personal, per-browser preference — localStorage,
// no DB column. useSyncExternalStore keeps it SSR-safe (server + first
// client render see the plain order, then it swaps in) with no
// setState-in-effect.
function subscribePins(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(PIN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PIN_EVENT, onChange);
  };
}
function pinsSnapshot(): string {
  try {
    return localStorage.getItem(PIN_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
const pinsServerSnapshot = () => "[]";

function writePins(next: string[]): void {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(next));
  } catch {
    /* private mode / disabled storage — pins just won't persist */
  }
  window.dispatchEvent(new Event(PIN_EVENT));
}

export function AdminShell({
  storeName,
  storefrontUrl,
  user,
  nav,
  locale,
  children,
}: {
  storeName: string;
  storefrontUrl: string | null;
  user: { name: string; role: StaffMember["role"]; isPlatformAdmin: boolean };
  nav: AdminNavItem[];
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = useTranslator();
  const pinsRaw = useSyncExternalStore(subscribePins, pinsSnapshot, pinsServerSnapshot);
  const pins = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(pinsRaw);
      return Array.isArray(parsed) ? parsed.filter((h): h is string => typeof h === "string") : [];
    } catch {
      return [];
    }
  }, [pinsRaw]);

  function togglePin(href: string) {
    writePins(pins.includes(href) ? pins.filter((h) => h !== href) : [...pins, href]);
  }

  const pinned = nav.filter((i) => pins.includes(i.href));
  const rest = nav.filter((i) => !pins.includes(i.href));

  const NavRow = ({ item }: { item: AdminNavItem }) => {
    const isPinned = pins.includes(item.href);
    return (
      <div className="flex items-center justify-between gap-2">
        <Link href={item.href} className="hover:underline">
          {t(item.labelKey)}
        </Link>
        <button
          type="button"
          onClick={() => togglePin(item.href)}
          title={isPinned ? t("admin.shell.unpin") : t("admin.shell.pinToTop")}
          aria-label={isPinned ? t("admin.shell.unpin") : t("admin.shell.pinToTop")}
          className={`text-xs ${isPinned ? "opacity-100" : "opacity-30 hover:opacity-70"}`}
        >
          📌
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col gap-5 border-r p-4">
        <Link href="/dashboard" className="font-semibold">
          {storeName}
        </Link>

        <nav className="flex flex-col gap-3 text-sm">
          {pinned.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {t("admin.shell.pinned")}
              </span>
              {pinned.map((item) => (
                <NavRow key={item.href} item={item} />
              ))}
              <hr />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {rest.map((item) => (
              <NavRow key={item.href} item={item} />
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b px-6 py-3 text-sm">
          {storefrontUrl && (
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {t("admin.shell.viewStore")} ↗
            </a>
          )}

          <details className="relative">
            <summary className="cursor-pointer list-none" title={t("admin.shell.notifications")}>
              🔔
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-64 rounded border bg-white p-3 text-xs text-gray-500 shadow">
              {t("admin.shell.noNotifications")}
            </div>
          </details>

          <details className="relative">
            <summary className="cursor-pointer list-none">{user.name}</summary>
            <div className="absolute right-0 z-10 mt-2 w-56 rounded border bg-white p-3 text-xs shadow">
              <p className="font-medium">{user.name}</p>
              <p className="text-gray-500">
                {t(STAFF_ROLE_KEYS[user.role])}
                {user.isPlatformAdmin && ` · ${t("admin.shell.platformAdmin")}`}
              </p>
              <form action={signOutAction} className="mt-2">
                <button type="submit" className="underline">
                  {t("admin.shell.signOut")}
                </button>
              </form>
            </div>
          </details>

          <LocaleToggle current={locale} />
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
