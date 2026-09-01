import nodemailer from "nodemailer";
import { EmailApiError, EmailNotConfiguredError, type EmailAdapter } from "./adapter";
import type { EmailConfig, EmailProvider, SendEmailParams, SendEmailResult } from "./types";

// One technical adapter for every SMTP-shaped provider — custom SMTP,
// SendGrid, Mailgun and Amazon SES all speak plain SMTP over
// host+port+username+password (SendGrid/Mailgun's "API key" is just the
// SMTP password; SES's is its SMTP credential pair, not the AWS API
// key/secret). CLAUDE.md rule #5 asks for "one implementation per
// provider" behind the interface — since the wire protocol is identical
// here, that's this one class, parametrized by `provider` only for
// error/log attribution (which label the merchant picked). `createEmailAdapter`
// (./index.ts) is still the single switch point callers go through; only
// this file imports nodemailer.
export class SmtpEmailAdapter implements EmailAdapter {
  readonly provider: EmailProvider;
  private readonly config: EmailConfig;

  constructor(provider: EmailProvider, config: EmailConfig) {
    if (!config.host || !config.port || !config.fromEmail) {
      throw new EmailNotConfiguredError(provider);
    }
    if (!config.credentials.username || !config.credentials.password) {
      throw new EmailNotConfiguredError(provider);
    }
    this.provider = provider;
    this.config = config;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const transport = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.credentials.username,
        pass: this.config.credentials.password,
      },
    });

    try {
      const info = await transport.sendMail({
        from: this.config.fromName
          ? `"${this.config.fromName}" <${this.config.fromEmail}>`
          : this.config.fromEmail,
        to: params.to,
        subject: params.subject,
        text: params.text,
      });
      return { providerMessageId: info.messageId ?? null };
    } catch (err) {
      throw new EmailApiError(
        err instanceof Error ? err.message : "SMTP send failed",
        this.provider,
        err
      );
    }
  }
}
