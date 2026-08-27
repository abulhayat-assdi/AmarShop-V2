import type { PaymentAdapter, PaymentInitiationParams, PaymentInitiationResult } from "./adapter";

const SANDBOX_URL = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
const LIVE_URL = "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

type SessionApiResponse = {
  status: string;
  GatewayPageURL?: string;
  failedreason?: string;
};

// Built against SSLCommerz's published Session API contract
// (https://developer.sslcommerz.com/doc/v4/) — NOT yet exercised against a
// live sandbox, since no SSLCOMMERZ_* credentials exist in this
// environment. Verify this end to end the first time real credentials are
// added, before trusting it in production.
//
// This is the outbound half (create a session, redirect to
// GatewayPageURL). The inbound confirmation — IPN listener + Order
// Validation API, the only thing that flips payments.status — lives in
// src/lib/payments/sslcommerz-confirm.ts (never trust the browser's
// redirect back to success_url alone to mean money moved).
export class SslcommerzAdapter implements PaymentAdapter {
  async initiate(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;

    if (!storeId || !storePassword) {
      throw new Error(
        "Online payment isn't set up yet for this store — choose Cash on Delivery, or contact the merchant."
      );
    }

    const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== "false";
    const endpoint = isSandbox ? SANDBOX_URL : LIVE_URL;

    // cus_city/cus_postcode are best-effort — our checkout only collects a
    // single free-text address (matching SITE_STRUCTURE.md), not the
    // granular city/postcode SSLCommerz's schema wants. These are
    // informational for the gateway, not validated against a real
    // address, and never shown back to the customer.
    const body = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: params.amount.toFixed(2),
      currency: "BDT",
      tran_id: params.tranId,
      success_url: params.returnUrl,
      fail_url: params.failUrl,
      cancel_url: params.cancelUrl,
      ipn_url: params.ipnUrl,
      // Echoed back on IPN/return so the notification resolves to a store
      // even when it doesn't arrive on that store's host.
      value_a: params.storeId,
      cus_name: params.customerName,
      cus_email: params.customerEmail || `${params.customerPhone}@guest.amarshop.invalid`,
      cus_phone: params.customerPhone,
      cus_add1: params.customerAddress,
      cus_city: params.deliveryZoneName || "N/A",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: "Order",
      product_category: "General",
      product_profile: "general",
      num_of_item: "1",
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new Error(`SSLCommerz session request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as SessionApiResponse;

    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      throw new Error(data.failedreason || "SSLCommerz did not return a payment session.");
    }

    return { kind: "redirect", redirectUrl: data.GatewayPageURL };
  }
}
