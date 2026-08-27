import type { PaymentAdapter } from "./adapter";
import { CodAdapter } from "./cod";
import { SslcommerzAdapter } from "./sslcommerz";

export type { PaymentAdapter, PaymentInitiationParams, PaymentInitiationResult } from "./adapter";

export function getPaymentAdapter(method: "cod" | "sslcommerz"): PaymentAdapter {
  switch (method) {
    case "cod":
      return new CodAdapter();
    case "sslcommerz":
      return new SslcommerzAdapter();
  }
}
