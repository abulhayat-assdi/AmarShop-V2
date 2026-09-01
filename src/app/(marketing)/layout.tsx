import { notFound } from "next/navigation";
import { getCurrentStore } from "@/lib/tenant/current";
import { MarketingShell } from "@/components/marketing/shell";

// The public marketing site (SITE_STRUCTURE.md Part A) — only ever served
// on the platform's own host, never on a merchant storefront. proxy.ts
// attaches no store for the platform host, so getCurrentStore() is null
// here; if a tenant host somehow reaches one of these paths (the
// storefront has no /features, /pricing, … route of its own), 404 rather
// than render marketing chrome on a merchant's domain.
//
// The homepage ("/") and /blog can't live in this route group — they
// share their path with the storefront branch — so src/app/page.tsx and
// src/app/blog/ render <MarketingShell> directly. This layout is that same
// shell plus the storeless guard.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentStore()) {
    notFound();
  }
  return <MarketingShell>{children}</MarketingShell>;
}
