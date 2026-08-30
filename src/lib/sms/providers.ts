import type { SmsProvider } from "./types";

// Client-safe metadata for the admin form (no server imports), mirroring
// src/lib/courier/providers.ts.

export const SMS_PROVIDERS: SmsProvider[] = ["bulksmsbd", "log"];

export const SMS_PROVIDER_LABELS: Record<SmsProvider, string> = {
  bulksmsbd: "BulkSMSBD",
  log: "Log only (no gateway)",
};

export type SmsCredentialField = {
  key: string;
  label: string;
  type: "text" | "password";
};

export const SMS_PROVIDER_CREDENTIAL_FIELDS: Record<SmsProvider, SmsCredentialField[]> = {
  bulksmsbd: [{ key: "apiKey", label: "API key", type: "password" }],
  log: [],
};
