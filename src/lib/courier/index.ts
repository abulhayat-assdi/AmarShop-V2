import type { CourierAdapter } from "./adapter";
import type { CourierConfig, CourierProvider } from "./types";
import { SteadfastAdapter } from "./steadfast";
import { PathaoAdapter } from "./pathao";
import { RedxAdapter } from "./redx";

export type { CourierAdapter } from "./adapter";
export { CourierApiError, CourierNotConfiguredError } from "./adapter";
export type * from "./types";

// Single switch point — the app resolves the store's active provider +
// credentials (src/lib/courier/settings.ts) and asks for an adapter here;
// it never news up a provider class directly.
export function createCourierAdapter(
  provider: CourierProvider,
  config: CourierConfig
): CourierAdapter {
  switch (provider) {
    case "steadfast":
      return new SteadfastAdapter(config);
    case "pathao":
      return new PathaoAdapter(config);
    case "redx":
      return new RedxAdapter(config);
  }
}
