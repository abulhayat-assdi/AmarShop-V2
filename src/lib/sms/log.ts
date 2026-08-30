import type { SmsAdapter } from "./adapter";
import type { SendSmsParams, SendSmsResult } from "./types";

// Writes to the console and returns success without calling any gateway.
// For local development and for a store that wants the outbox record
// without a real SMS account. Mirrors the crypto module's `plain:` and the
// custom-domain CUSTOM_DOMAIN_VERIFY_MODE=trust dev fallbacks.
export class LogSmsAdapter implements SmsAdapter {
  readonly provider = "log" as const;

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    console.info(`[sms:log] to=${params.to} sender=${params.senderId ?? "-"} :: ${params.text}`);
    return { providerMessageId: null };
  }
}
