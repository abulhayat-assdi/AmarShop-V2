import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hostname, isPlatformHost, resolveHost } from "@/lib/tenant/resolve";
import { STORE_ID_HEADER } from "@/lib/tenant/constants";

// Runs before every route. Resolves which store (if any) a request belongs
// to, purely from the Host header, and attaches it to request context via
// a header — every Server Component/Action reads that header (see
// src/lib/tenant/current.ts) instead of re-resolving the host itself.
// The platform's own admin/marketing hosts skip resolution entirely.
export async function proxy(request: NextRequest) {
  // Port-less: a "localhost:3000" dev host and a plain "localhost" behind
  // Caddy must resolve identically (see hostname() in tenant/resolve.ts).
  const host = hostname(request.headers.get("host") ?? "");

  if (isPlatformHost(host)) {
    return NextResponse.next();
  }

  const resolution = await resolveHost(host);

  if (!resolution) {
    return new NextResponse("Store not found", { status: 404 });
  }

  // A custom domain and its www<->apex sibling both resolve; serve only on
  // the one the merchant saved and 308 the other to it (path preserved).
  if (host !== resolution.canonicalHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`${proto}://${resolution.canonicalHost}${pathname}${search}`, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(STORE_ID_HEADER, resolution.store.id);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and uploaded media — tenant
    // resolution never needs to run for these, and running it would just
    // slow them down. /uploads is served by a public, store-agnostic route
    // handler (src/app/uploads/[...key]/route.ts). /api/internal/* is
    // platform-internal (Caddy -> app over the Docker network), also
    // store-agnostic — resolving a tenant from its Host header would just
    // 404 it.
    "/((?!_next/static|_next/image|favicon.ico|uploads/|api/internal/).*)",
  ],
};
