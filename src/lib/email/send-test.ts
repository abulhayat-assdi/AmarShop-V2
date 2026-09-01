import { withStoreContext } from "@/db/context";
import { emailMessages } from "@/db/schema";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";
import { createEmailAdapter } from "./index";
import { getActiveEmailConfig } from "./settings";

export type SendTestResult = { ok: true } | { error: MessageRef };

// The only email sender in this slice — no storefront/order feature is
// wired to send email yet (CLAUDE.md: settings-only for now). Lets a
// merchant prove their credentials work before relying on them later.
// Always logs an email_messages row, success or failure, mirroring how
// sms_messages logs every real order notification.
export async function sendTestEmail(storeId: string, toEmail: string): Promise<SendTestResult> {
  const active = await getActiveEmailConfig(storeId);
  if (!active) return { error: msg("admin.emailGateways.errNotConfigured") };

  const subject = "Test email from your AmarShop store";
  const text =
    "This is a test email sent from your store's Email Gateway settings. " +
    "If you received this, your provider is configured correctly.";

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;
  try {
    const adapter = createEmailAdapter(active.provider, active.config);
    await adapter.send({ to: toEmail, subject, text });
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  await withStoreContext(storeId, (tx) =>
    tx.insert(emailMessages).values({ storeId, toEmail, subject, status, errorMessage })
  );

  return status === "sent"
    ? { ok: true }
    : { error: msg("admin.emailGateways.errSendFailed", { detail: errorMessage ?? "" }) };
}
