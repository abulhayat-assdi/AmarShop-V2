import { getCurrentStore } from "@/lib/tenant/current";
import { confirmSslcommerzPayment } from "@/lib/payments/sslcommerz-confirm";

// SSLCommerz's success_url — the customer is redirected here (a form POST)
// after paying. We run the same confirmation so the confirmation page
// shows the final state right away; the IPN is the safety net if this
// fails. Then a 303 (forces GET) to the storefront confirmation page. A
// relative Location keeps this on whatever host the request arrived on
// (the store's own), no matter how the proxy rewrites req.url.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

async function handle(req: Request): Promise<Response> {
  let fields: Record<string, string> = {};
  if (req.method === "POST") {
    try {
      const form = await req.formData();
      fields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    } catch {
      /* fall through — redirect anyway */
    }
  } else {
    fields = Object.fromEntries(new URL(req.url).searchParams.entries());
  }

  const tranId = fields.tran_id;
  if (!tranId) {
    return seeOther("/checkout");
  }

  const resolvedStore = await getCurrentStore();
  const storeId =
    resolvedStore?.id ?? (UUID_RE.test(fields.value_a ?? "") ? fields.value_a : null);
  if (storeId) {
    try {
      await confirmSslcommerzPayment({ storeId, tranId, valId: fields.val_id || null });
    } catch (err) {
      // The IPN will confirm it — don't block the customer's redirect.
      console.error(`[sslcommerz return] confirmation failed for tran ${tranId}`, err);
    }
  }

  return seeOther(`/order/${encodeURIComponent(tranId)}/confirmation`);
}

export const GET = handle;
export const POST = handle;
