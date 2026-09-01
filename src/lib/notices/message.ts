import type { TranslateVars, Translator } from "@/lib/i18n/translate";
import type { Notice } from "@/db/schema";

// Turns a notice's jsonb `metadata` into safe {placeholder} vars for
// Translator — only string/number values pass through, matching
// TranslateVars. Client-safe (no server-only imports) so both the admin
// bell and the /notices page can share it.
function noticeVars(metadata: unknown): TranslateVars | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const out: TranslateVars = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number") out[key] = value;
  }
  return out;
}

// A notice's `category` is validated against NOTICE_CATEGORIES on write
// (src/lib/notices/categories.ts) — the message itself is never stored,
// it's always looked up fresh so it renders in whichever locale the admin
// is currently viewing in, not whichever locale was active when it fired.
export function noticeMessage(t: Translator, notice: Pick<Notice, "category" | "metadata">): string {
  return t(`admin.notices.${notice.category}`, noticeVars(notice.metadata));
}
