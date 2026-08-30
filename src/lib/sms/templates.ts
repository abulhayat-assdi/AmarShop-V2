// Customer-facing SMS text — deliberately NOT in the i18n message files:
// it's not UI copy, it must stay one terse line, and it's rendered in the
// store's own locale, not the visitor's. {store} / {code} / {total} are
// filled by src/lib/sms/notifications.ts.

type SmsEvent = "order_placed" | "order_shipped";

const TEMPLATES: Record<SmsEvent, { en: string; bn: string }> = {
  order_placed: {
    en: "{store}: order {code} received, total Tk {total}. Track it on our site. Thank you!",
    bn: "{store}: অর্ডার {code} পাওয়া গেছে, মোট ৳{total}। সাইটে ট্র্যাক করুন। ধন্যবাদ!",
  },
  order_shipped: {
    en: "{store}: order {code} has been shipped and is on its way.",
    bn: "{store}: অর্ডার {code} পাঠানো হয়েছে, পথে আছে।",
  },
};

export function renderSmsTemplate(
  event: SmsEvent,
  locale: string,
  vars: { store: string; code: string; total: string }
): string {
  const t = TEMPLATES[event];
  const template = locale === "bn" ? t.bn : t.en;
  return template
    .replace("{store}", vars.store)
    .replace("{code}", vars.code)
    .replace("{total}", vars.total);
}
