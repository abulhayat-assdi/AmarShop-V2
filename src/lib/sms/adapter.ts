import type { SendSmsParams, SendSmsResult, SmsProvider } from "./types";

// One implementation per provider (CLAUDE.md rule #5) — callers go through
// createSmsAdapter (./index.ts), never a provider class directly.
export interface SmsAdapter {
  readonly provider: SmsProvider;
  send(params: SendSmsParams): Promise<SendSmsResult>;
}

export class SmsApiError extends Error {
  constructor(
    message: string,
    readonly provider: SmsProvider,
    readonly detail?: unknown
  ) {
    super(message);
    this.name = "SmsApiError";
  }
}

export class SmsNotConfiguredError extends Error {
  constructor(readonly provider: SmsProvider) {
    super(`SMS provider "${provider}" is missing required credentials`);
    this.name = "SmsNotConfiguredError";
  }
}
