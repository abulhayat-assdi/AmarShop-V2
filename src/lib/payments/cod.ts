import type { PaymentAdapter, PaymentInitiationResult } from "./adapter";

// Cash on Delivery — no external call. Payment is recorded `pending` and
// stays that way until a staff member marks it collected at delivery (that
// admin action doesn't exist yet — a later "manual order management" slice).
export class CodAdapter implements PaymentAdapter {
  async initiate(): Promise<PaymentInitiationResult> {
    return { kind: "immediate" };
  }
}
