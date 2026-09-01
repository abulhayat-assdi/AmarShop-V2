// Pure types — client-safe (no fetch, no node imports). Mirrors the
// SMS/courier/payment adapter type shape (src/lib/sms/types.ts).

export type EmailProvider = "smtp" | "sendgrid" | "mailgun" | "ses" | "log";

export type EmailCredentials = Record<string, string>;

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  fromName: string | null;
  fromEmail: string;
  credentials: EmailCredentials;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = {
  providerMessageId: string | null;
};
