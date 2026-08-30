"use client";

import { useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { markLeadContacted, dismissLead } from "./actions";

// Inline two-step confirm for Dismiss, no native confirm() (CLAUDE.md).
// "Mark contacted" is a one-click action, shown only while the lead is
// still new.
export function LeadRowActions({
  leadId,
  status,
}: {
  leadId: string;
  status: "pending" | "contacted";
}) {
  const t = useTranslator();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 text-sm">
      {status === "pending" && (
        <form action={markLeadContacted.bind(null, leadId)}>
          <button type="submit" className="underline">
            {t("admin.leads.markContacted")}
          </button>
        </form>
      )}
      {confirming ? (
        <span className="flex items-center gap-2">
          <span className="text-gray-600">{t("admin.leads.dismissQ")}</span>
          <form action={dismissLead.bind(null, leadId)}>
            <button type="submit" className="text-red-600 underline">
              {t("admin.leads.confirm")}
            </button>
          </form>
          <button type="button" onClick={() => setConfirming(false)} className="underline">
            {t("admin.leads.cancel")}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-red-600 underline"
        >
          {t("admin.leads.dismiss")}
        </button>
      )}
    </div>
  );
}
