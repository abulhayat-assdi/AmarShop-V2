import type { PaymentAdapter, SslcommerzConfig } from "./adapter";
import { CodAdapter } from "./cod";
import { SslcommerzAdapter } from "./sslcommerz";

export type {
  PaymentAdapter,
  PaymentInitiationParams,
  PaymentInitiationResult,
  SslcommerzConfig,
} from "./adapter";

export function getPaymentAdapter(
  method: "cod" | "sslcommerz",
  config?: SslcommerzConfig | null
): PaymentAdapter {
  switch (method) {
    case "cod":
      return new CodAdapter();
    case "sslcommerz":
      return new SslcommerzAdapter(config ?? null);
  }
}
