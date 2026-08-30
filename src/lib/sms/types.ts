// Pure types — client-safe (no fetch, no node imports). Mirrors the
// courier/payment adapter type shape.

export type SmsProvider = "bulksmsbd" | "log";

export type SmsCredentials = Record<string, string>;

export type SmsConfig = {
  sandbox: boolean;
  credentials: SmsCredentials;
};

export type SendSmsParams = {
  // Already normalised to a BD MSISDN (8801XXXXXXXXX) by the caller.
  to: string;
  text: string;
  senderId: string | null;
};

export type SendSmsResult = {
  providerMessageId: string | null;
};
