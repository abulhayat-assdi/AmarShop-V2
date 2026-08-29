import { NextResponse } from "next/server";
import { resolveStoreForHost } from "@/lib/tenant/resolve";
import { normalizeCustomDomain } from "@/lib/tenant/custom-domain";

// Caddy's on-demand-TLS `ask` endpoint (see Caddyfile.production). Caddy
// calls this before issuing a certificate for a hostname: 200 = proceed,
// anything else = refuse. Without this gate, anyone could point a domain
// at our IP and make us request certificates on their behalf.
//
// The set of hosts that get a cert is exactly the set that resolves to a
// store — slug subdomains and verified custom domains alike — so it reuses
// resolveStoreForHost() rather than re-implementing the check. One indexed
// lookup on stores (no RLS; stores is outside the tenant boundary).
// proxy.ts excludes /api/internal/* from tenant resolution, so this is
// reached directly.

export async function GET(req: Request) {
  const domain = normalizeCustomDomain(new URL(req.url).searchParams.get("domain") ?? "");
  if (!domain) return new NextResponse("missing domain", { status: 400 });

  const store = await resolveStoreForHost(domain);
  return store
    ? new NextResponse("ok", { status: 200 })
    : new NextResponse("unknown domain", { status: 404 });
}
