import type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";

// One implementation per provider (CLAUDE.md rule #5) — callers go through
// createEmailAdapter (./index.ts), never a provider class directly.
export interface EmailAdapter {
  readonly provider: EmailProvider;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}

export class EmailApiError extends Error {
  constructor(
    message: string,
    readonly provider: EmailProvider,
    readonly detail?: unknown
  ) {
    super(message);
    this.name = "EmailApiError";
  }
}

export class EmailNotConfiguredError extends Error {
  constructor(readonly provider: EmailProvider) {
    super(`Email provider "${provider}" is missing required settings`);
    this.name = "EmailNotConfiguredError";
  }
}
