import type { EmailAdapter } from "./adapter";
import type { SendEmailParams, SendEmailResult } from "./types";

// Writes to the console and returns success without calling any gateway.
// For local development and for a store that wants the outbox record
// without a real email account. Mirrors src/lib/sms/log.ts.
export class LogEmailAdapter implements EmailAdapter {
  readonly provider = "log" as const;

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    console.info(`[email:log] to=${params.to} subject="${params.subject}" :: ${params.text}`);
    return { providerMessageId: null };
  }
}
