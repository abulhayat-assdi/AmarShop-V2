import type { PaymentAdapter, PaymentInitiationResult } from "./adapter";

// Manual bKash / Nagad "Send Money" — no API, no redirect. The customer
// sends money to the merchant's own wallet number (shown at checkout) and
// types in the transaction id; the order is recorded with a `pending`
// payment, and the customer-entered wallet / sender number / TrxID are
// stored on the payments row (src/lib/orders/create.ts). A staff member
// verifies against their wallet app and clicks "Mark payment received"
// (src/app/(admin)/orders/actions.ts). Nothing here talks to a gateway.
export class ManualWalletAdapter implements PaymentAdapter {
  async initiate(): Promise<PaymentInitiationResult> {
    return { kind: "immediate" };
  }
}
