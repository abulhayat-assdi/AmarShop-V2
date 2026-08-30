import { SmsApiError, SmsNotConfiguredError, type SmsAdapter } from "./adapter";
import type { SendSmsParams, SendSmsResult, SmsConfig } from "./types";

// BulkSMSBD — https://bulksmsbd.net (bulksmsbd.net/api/smsapi). Static
// api_key auth, one-way send. Written against the published API contract;
// NOT yet exercised against a live account (no credentials in this
// environment). Verify end to end the first time real keys are added.
const ENDPOINT = "http://bulksmsbd.net/api/smsapi";

type ApiResponse = {
  response_code?: number;
  message_id?: number | string;
  success_message?: string;
  error_message?: string;
};

export class BulkSmsBdAdapter implements SmsAdapter {
  readonly provider = "bulksmsbd" as const;
  private readonly apiKey: string;

  constructor(config: SmsConfig) {
    const key = config.credentials.apiKey?.trim();
    if (!key) throw new SmsNotConfiguredError("bulksmsbd");
    this.apiKey = key;
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const body = new URLSearchParams({
      api_key: this.apiKey,
      senderid: params.senderId ?? "",
      number: params.to,
      message: params.text,
    });

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (err) {
      throw new SmsApiError("BulkSMSBD request failed", "bulksmsbd", err);
    }

    let data: ApiResponse;
    try {
      data = (await res.json()) as ApiResponse;
    } catch {
      throw new SmsApiError(`BulkSMSBD returned a non-JSON response (HTTP ${res.status})`, "bulksmsbd");
    }

    // 202 = accepted. Anything else is a delivery/credential/format error.
    if (data.response_code !== 202) {
      throw new SmsApiError(
        data.error_message || `BulkSMSBD rejected the message (code ${data.response_code ?? "?"})`,
        "bulksmsbd",
        data
      );
    }

    return { providerMessageId: data.message_id != null ? String(data.message_id) : null };
  }
}
