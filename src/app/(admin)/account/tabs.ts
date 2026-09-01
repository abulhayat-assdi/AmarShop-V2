// SITE_STRUCTURE.md's General Settings tab set. URL-synced (?tab=...) —
// not client-only state, per this repo's own rule (Orders' status tabs
// bug: only pagination was synced to the URL, so refreshing lost the
// filter). Order here is also the display order.
export const ACCOUNT_TABS = [
  "profile",
  "appearance",
  "notifications",
  "security",
  "company",
  "system",
] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function isAccountTab(value: string | undefined): value is AccountTab {
  return !!value && (ACCOUNT_TABS as readonly string[]).includes(value);
}

export const ACCOUNT_TAB_LABEL_KEYS: Record<AccountTab, string> = {
  profile: "admin.account.tabs.profile",
  appearance: "admin.account.tabs.appearance",
  notifications: "admin.account.tabs.notifications",
  security: "admin.account.tabs.security",
  company: "admin.account.tabs.company",
  system: "admin.account.tabs.system",
};
