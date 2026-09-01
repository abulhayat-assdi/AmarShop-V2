"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/roles";
import { createPlatformInvoice, submitInvoicePayment } from "@/lib/billing/subscription";
import { isValidCycle, isValidPlanId } from "@/lib/billing/plans";
import { msg, type MessageRef } from "@/lib/i18n/message-ref";

export type BillingActionState = { error?: MessageRef; ok?: MessageRef };

// Merchant picks a plan + cycle → open a fresh pending invoice for it.
export async function selectPlanAction(
  _prev: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const session = await requirePermission("billing:manage");

  const plan = String(formData.get("plan") ?? "");
  const cycle = String(formData.get("cycle") ?? "");
  if (!isValidPlanId(plan)) return { error: msg("billing.errPlan") };
  if (!isValidCycle(cycle)) return { error: msg("billing.errCycle") };

  await createPlatformInvoice(session.user.storeId, plan, cycle);
  revalidatePath("/billing");
  return { ok: msg("billing.planSelected") };
}

// Merchant reports the bKash/Nagad transfer they made for a pending invoice.
export async function submitPaymentAction(
  invoiceId: string,
  _prev: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const session = await requirePermission("billing:manage");

  const walletProvider = String(formData.get("walletProvider") ?? "");
  const senderMsisdn = String(formData.get("senderMsisdn") ?? "").trim();
  const senderReference = String(formData.get("senderReference") ?? "").trim();

  if (walletProvider !== "bkash" && walletProvider !== "nagad") {
    return { error: msg("billing.errWallet") };
  }
  if (!/^[0-9+\-\s]{6,20}$/.test(senderMsisdn)) return { error: msg("billing.errSender") };
  if (senderReference.length < 3) return { error: msg("billing.errTrx") };

  const updated = await submitInvoicePayment(session.user.storeId, invoiceId, {
    walletProvider,
    senderMsisdn,
    senderReference,
  });
  if (!updated) return { error: msg("billing.errNoPending") };

  revalidatePath("/billing");
  return { ok: msg("billing.paymentSubmitted") };
}
