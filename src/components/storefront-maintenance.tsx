import { I18nProvider } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import type { Translator } from "@/lib/i18n/translate";

// Shared between src/app/page.tsx (the platform-root/homepage URL — see
// its own comment on why it can't just live under (storefront)/layout.tsx)
// and (storefront)/layout.tsx (every other storefront route). Keeping this
// in one place means a merchant's "closed for maintenance" page looks and
// behaves identically everywhere it can appear.
export function StorefrontMaintenance({
  storeName,
  locale,
  messages,
  t,
}: {
  storeName: string;
  locale: Locale;
  messages: Messages;
  t: Translator;
}) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <main className="mx-auto flex max-w-md flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-xl font-semibold">{storeName}</h1>
        <p className="text-gray-600">{t("maintenance.message")}</p>
      </main>
    </I18nProvider>
  );
}
