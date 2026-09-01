import type { EmailProvider } from "./types";

// Client-safe metadata for the admin form (no server imports), mirroring
// src/lib/sms/providers.ts.

export const EMAIL_PROVIDERS: EmailProvider[] = ["smtp", "sendgrid", "mailgun", "ses", "log"];

export const EMAIL_PROVIDER_LABELS: Record<EmailProvider, string> = {
  smtp: "Custom SMTP",
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  ses: "Amazon SES",
  log: "Log only (no gateway)",
};

// smtp/sendgrid/mailgun/ses are all SMTP-shaped (host+port+username+
// password) — one adapter (src/lib/email/smtp.ts) serves all four. This
// preset just pre-fills host/port/secure in the admin form when a
// merchant picks a known provider; smtp/ses have no fixed host (SES is
// region-specific) so there's no entry for them — the fields stay
// editable either way.
export const EMAIL_PROVIDER_PRESET: Partial<
  Record<EmailProvider, { host: string; port: number; secure: boolean }>
> = {
  sendgrid: { host: "smtp.sendgrid.net", port: 587, secure: false },
  mailgun: { host: "smtp.mailgun.org", port: 587, secure: false },
};

export type EmailCredentialField = {
  key: "username" | "password";
  label: string;
  type: "text" | "password";
};

const SMTP_AUTH_FIELDS: EmailCredentialField[] = [
  { key: "username", label: "SMTP username", type: "text" },
  { key: "password", label: "SMTP password", type: "password" },
];

export const EMAIL_PROVIDER_CREDENTIAL_FIELDS: Record<EmailProvider, EmailCredentialField[]> = {
  smtp: SMTP_AUTH_FIELDS,
  sendgrid: [
    { key: "username", label: 'Username (usually "apikey")', type: "text" },
    { key: "password", label: "API key", type: "password" },
  ],
  mailgun: SMTP_AUTH_FIELDS,
  ses: SMTP_AUTH_FIELDS,
  log: [],
};
