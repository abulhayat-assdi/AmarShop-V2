import { NextResponse } from "next/server";
import { getCurrentStore } from "@/lib/tenant/current";
import { confirmSslcommerzPayment, verifyIpnSignature } from "@/lib/payments/sslcommerz-confirm";

// SSLCommerz's server-to-server notification. Configured as ipn_url on the
// session (src/lib/payments/sslcommerz.ts) — arrives on the store's own
// host, so getCurrentStore() resolves the tenant; value_a is the fallback.
//
// Always 200 once we've processed (or safely ignored) a notification, so
// SSLCommerz stops retrying. 503 only for a transient validation-API
// failure (do retry); 400 for a malformed body.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  let fields: Record<string, string>;
  try {
    const form = await req.formData();
    fields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  const tranId = fields.tran_id;
  if (!tranId) return new NextResponse("missing tran_id", { status: 400 });

  if (!verifyIpnSignature(fields)) {
    console.warn(`[sslcommerz ipn] signature check failed for tran ${tranId}`);
    // Not fatal — the Order Validation call (with our credentials) is the
    // real gate; a forged val_id fails validation.
  }

  const resolvedStore = await getCurrentStore();
  const storeId =
    resolvedStore?.id ?? (UUID_RE.test(fields.value_a ?? "") ? fields.value_a : null);
  if (!storeId) {
    console.warn(`[sslcommerz ipn] could not resolve store for tran ${tranId}`);
    return new NextResponse("unknown store", { status: 400 });
  }

  try {
    const result = await confirmSslcommerzPayment({
      storeId,
      tranId,
      valId: fields.val_id || null,
    });
    return new NextResponse(`OK ${result}`, { status: 200 });
  } catch (err) {
    console.error(`[sslcommerz ipn] confirmation failed for tran ${tranId}`, err);
    return new NextResponse("retry", { status: 503 });
  }
}
