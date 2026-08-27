import { createHash, createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { withStoreContext } from "@/db/context";
import { payments } from "@/db/schema";
import { getSslcommerzConfig } from "./settings";

// Inbound half of the SSLCommerz integration — the trusted confirmation
// (PROJECT_PLAN.md §5: never trust the browser redirect). The IPN listener
// and the success-return handler both call confirmSslcommerzPayment(); the
// Order Validation API is the only thing that flips payments.status.
// Credentials are per-store (store_payment_settings).

const SANDBOX_BASE = "https://sandbox.sslcommerz.com";
const LIVE_BASE = "https://securepay.sslcommerz.com";

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

function equalHex(a: string, b: string): boolean {
  const ba = Buffer.from((a ?? "").toLowerCase());
  const bb = Buffer.from((b ?? "").toLowerCase());
  return ba.length > 0 && ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Reconstructs SSLCommerz's hash input: the fields named in `verify_key`,
// plus store_passwd=md5(password), sorted, joined as k=v&… .
export function buildSignatureBase(
  fields: Record<string, string>,
  storePassword: string
): string | null {
  const verifyKey = fields.verify_key;
  if (!verifyKey) return null;
  const data: Record<string, string> = {};
  for (const rawKey of verifyKey.split(",")) {
    const key = rawKey.trim();
    if (key && fields[key] !== undefined) data[key] = fields[key];
  }
  data.store_passwd = md5(storePassword);
  return Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("&");
}

// Proves the IPN/return POST really came from SSLCommerz. A false result
// is logged by the caller but doesn't block confirmation — the Order
// Validation call (with our own credentials) is the real gate.
export function verifyIpnSignature(
  fields: Record<string, string>,
  storePassword: string
): boolean {
  if (!storePassword) return false;
  const base = buildSignatureBase(fields, storePassword);
  if (!base) return false;

  if (fields.verify_sign_sha2) {
    const expected = createHmac("sha256", storePassword).update(base).digest("hex");
    return equalHex(expected, fields.verify_sign_sha2);
  }
  if (fields.verify_sign) {
    return equalHex(md5(base), fields.verify_sign);
  }
  return false;
}

type ValidationResponse = {
  status?: string;
  tran_id?: string;
  amount?: string;
  currency?: string;
  bank_tran_id?: string;
};

async function callValidator(
  valId: string,
  cfg: { storeId: string; storePassword: string; sandbox: boolean }
): Promise<ValidationResponse> {
  const url =
    `${cfg.sandbox ? SANDBOX_BASE : LIVE_BASE}/validator/api/validationserverAPI.php?` +
    new URLSearchParams({
      val_id: valId,
      store_id: cfg.storeId,
      store_passwd: cfg.storePassword,
      format: "json",
      v: "1",
    }).toString();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`validation API HTTP ${res.status}`);
  return (await res.json()) as ValidationResponse;
}

async function setStatus(
  storeId: string,
  paymentId: string,
  status: "paid" | "failed",
  gatewayReference?: string | null
): Promise<void> {
  await withStoreContext(storeId, (tx) =>
    tx
      .update(payments)
      .set({ status, gatewayReference: gatewayReference ?? null, updatedAt: new Date() })
      .where(
        and(
          eq(payments.storeId, storeId),
          eq(payments.id, paymentId),
          eq(payments.status, "pending")
        )
      )
  );
}

export type ConfirmResult = "paid" | "failed" | "ignored";

// Throws only on a transient validation-API failure (so the IPN retries).
// Every other outcome is a definitive "paid" / "failed" / "ignored".
export async function confirmSslcommerzPayment(input: {
  storeId: string;
  tranId: string;
  valId: string | null;
}): Promise<ConfirmResult> {
  const cfg = await getSslcommerzConfig(input.storeId);
  if (!cfg) {
    console.warn(
      `[sslcommerz] confirmation skipped for store ${input.storeId} — no payment settings`
    );
    return "ignored";
  }

  const payment = await withStoreContext(input.storeId, async (tx) => {
    const [row] = await tx
      .select({ id: payments.id, status: payments.status, amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.storeId, input.storeId),
          eq(payments.transactionId, input.tranId),
          eq(payments.method, "sslcommerz")
        )
      )
      .limit(1);
    return row ?? null;
  });

  if (!payment) return "ignored";
  if (payment.status === "paid" || payment.status === "failed") return "ignored";

  if (!input.valId) {
    // A fail / cancel notification carries no val_id — nothing to validate.
    await setStatus(input.storeId, payment.id, "failed");
    return "failed";
  }

  const data = await callValidator(input.valId, cfg);

  const accepted =
    (data.status === "VALID" || data.status === "VALIDATED") &&
    data.tran_id === input.tranId &&
    (data.currency ?? "BDT") === "BDT" &&
    Math.abs(Number(data.amount) - Number(payment.amount)) < 0.01;

  if (accepted) {
    await setStatus(input.storeId, payment.id, "paid", data.bank_tran_id ?? null);
    return "paid";
  }

  console.warn(
    `[sslcommerz] validation rejected for tran ${input.tranId}: status=${data.status} amount=${data.amount} tran_id=${data.tran_id} currency=${data.currency}`
  );
  await setStatus(input.storeId, payment.id, "failed");
  return "failed";
}
