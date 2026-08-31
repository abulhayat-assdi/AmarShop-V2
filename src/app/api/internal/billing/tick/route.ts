import { NextResponse } from "next/server";
import { runBillingLifecycle } from "@/lib/billing/lifecycle";

// Billing lifecycle sweep, POSTed on a schedule by the `billing-cron`
// docker-compose service (an hourly curl loop). Reached directly —
// proxy.ts excludes /api/internal/* from tenant resolution.
//
// Guarded by a shared secret: unlike the read-only domain-check endpoint
// this one mutates store rows. BILLING_TICK_SECRET must be set (503 if
// not), and the request must carry `Authorization: Bearer <secret>`.
export async function POST(req: Request) {
  const secret = process.env.BILLING_TICK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "billing tick not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runBillingLifecycle();
  return NextResponse.json({ ok: true, ...result });
}
