import { randomInt } from "crypto";
import { and, eq } from "drizzle-orm";
import type { TenantTx } from "@/db/context";
import { orders } from "@/db/schema";

// The customer-facing order reference. Deliberately NOT sequential:
//
//   - a small sequential space is enumerable. Anyone holding a phone
//     number could walk 1,2,3… against /track and pull that person's
//     address and purchase history. Per-IP rate limiting doesn't stop it
//     (IPs rotate); a 10^12 keyspace does.
//   - sequential numbers leak the merchant's order volume to anyone who
//     places two orders a month apart (the German tank problem), which no
//     amount of rate limiting can prevent.
//
// The sequential series accounting actually needs is the invoice number
// (src/lib/invoices/number.ts), which is unaffected — so nothing is lost
// by making this one random.
//
// Crockford Base32: no I, L, O or U, so it survives being read aloud over
// a phone call and can't spell anything unfortunate. 32^8 ≈ 1.1e12.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    // randomInt (CSPRNG, rejection-sampled) rather than Math.random — an
    // order code is an access credential, not a cosmetic id.
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

// Allocated inside the caller's order-creation transaction. A collision is
// vanishingly unlikely, but the (store_id, order_code) unique index is the
// real backstop; this loop just avoids failing the whole order over one.
export async function allocateOrderCode(tx: TenantTx, storeId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode();
    const [existing] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.orderCode, candidate)))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new Error("Could not allocate a unique order code");
}

// Human-facing form: "K7M2-9XQ4" — grouped so it's easy to read back.
export function formatOrderCode(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

// Accepts what a customer actually types: lowercase, spaces, the grouping
// dash, and the letters Crockford treats as digits (O for 0, I/L for 1).
// Returns null when the result isn't a well-formed code.
export function normalizeOrderCode(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/^#/, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");

  if (cleaned.length !== CODE_LENGTH) return null;
  for (const char of cleaned) {
    if (!ALPHABET.includes(char)) return null;
  }
  return cleaned;
}
