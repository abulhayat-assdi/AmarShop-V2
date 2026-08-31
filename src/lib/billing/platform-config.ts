// The platform's OWN bKash / Nagad "Send Money" numbers — where merchants
// send their subscription payment. Shown to merchants on the Billing page,
// so these are config, not secrets. One platform instance → env vars are
// enough; a settings table can come later if the platform ever needs to
// change them without a deploy.

export type PlatformBillingConfig = {
  bkashNumber: string | null;
  nagadNumber: string | null;
  instructions: string | null;
};

export function getPlatformBillingConfig(): PlatformBillingConfig {
  return {
    bkashNumber: process.env.PLATFORM_BKASH_NUMBER?.trim() || null,
    nagadNumber: process.env.PLATFORM_NAGAD_NUMBER?.trim() || null,
    instructions: process.env.PLATFORM_BILLING_INSTRUCTIONS?.trim() || null,
  };
}
