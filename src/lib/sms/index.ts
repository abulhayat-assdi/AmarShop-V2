import type { SmsAdapter } from "./adapter";
import type { SmsConfig, SmsProvider } from "./types";
import { BulkSmsBdAdapter } from "./bulksmsbd";
import { LogSmsAdapter } from "./log";

export type { SmsAdapter } from "./adapter";
export { SmsApiError, SmsNotConfiguredError } from "./adapter";
export type * from "./types";

// Single switch point — the app resolves the store's provider + credentials
// (src/lib/sms/settings.ts) and asks for an adapter here; it never news up
// a provider class directly (CLAUDE.md rule #5).
export function createSmsAdapter(provider: SmsProvider, config: SmsConfig): SmsAdapter {
  switch (provider) {
    case "bulksmsbd":
      return new BulkSmsBdAdapter(config);
    case "log":
      return new LogSmsAdapter();
  }
}
