import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPlatformHost, resolveStoreForHost } from "@/lib/tenant/resolve";
import { STORE_ID_HEADER } from "@/lib/tenant/constants";

// Runs before every route. Resolves which store (if any) a request belongs
// to, purely from the Host header, and attaches it to request context via
// a header — every Server Component/Action reads that header (see
// src/lib/tenant/current.ts) instead of re-resolving the host itself.
// The platform's own admin/marketing hosts skip resolution entirely.
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (isPlatformHost(host)) {
    return NextResponse.next();
  }

  const store = await resolveStoreForHost(host);

  if (!store) {
    return new NextResponse("Store not found", { status: 404 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(STORE_ID_HEADER, store.id);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    // Skip static assets and image optimization — tenant resolution never
    // needs to run for these, and running it would just slow them down.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
