import type { EmailAdapter } from "./adapter";
import type { EmailConfig, EmailProvider } from "./types";
import { SmtpEmailAdapter } from "./smtp";
import { LogEmailAdapter } from "./log";

export type { EmailAdapter } from "./adapter";
export { EmailApiError, EmailNotConfiguredError } from "./adapter";
export type * from "./types";

// Single switch point — the app resolves the store's provider + settings
// (src/lib/email/settings.ts) and asks for an adapter here; it never news
// up a provider class directly (CLAUDE.md rule #5).
export function createEmailAdapter(provider: EmailProvider, config: EmailConfig): EmailAdapter {
  if (provider === "log") return new LogEmailAdapter();
  return new SmtpEmailAdapter(provider, config);
}
