"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslator } from "@/components/i18n-provider";
import { saveGuestCheckoutSettingsAction, type GuestCheckoutState } from "./actions";

const initialState: GuestCheckoutState = {};

export function GuestCheckoutForm({
  checkoutOtpRequired,
  smsConnected,
}: {
  checkoutOtpRequired: boolean;
  smsConnected: boolean;
}) {
  const [state, formAction, isPending] = useActionState(saveGuestCheckoutSettingsAction, initialState);
  const t = useTranslator();
  // Never let the toggle end up "on" with no gateway to actually send the
  // OTP through — force it off in the UI when disconnected, regardless of
  // the stored value (matches SITE_STRUCTURE.md's own instruction).
  const [otpRequired, setOtpRequired] = useState(smsConnected && checkoutOtpRequired);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.guestCheckout.saved")}
        </p>
      )}

      {!smsConnected && (
        <p className="rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("admin.guestCheckout.needsGateway")}{" "}
          <Link href="/sms-settings" className="font-semibold underline">
            {t("admin.nav.smsSettings")}
          </Link>
        </p>
      )}

      <label
        className={`flex items-start gap-3 text-sm ${!smsConnected ? "opacity-50" : ""}`}
        title={!smsConnected ? t("admin.guestCheckout.needsGateway") : undefined}
      >
        <input
          type="checkbox"
          name="checkoutOtpRequired"
          checked={otpRequired}
          disabled={!smsConnected}
          onChange={(e) => setOtpRequired(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block font-medium">{t("admin.guestCheckout.otpLabel")}</span>
          <span className="block text-xs text-gray-500">{t("admin.guestCheckout.otpHint")}</span>
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? t("admin.common.saving") : t("admin.common.save")}
      </button>
    </form>
  );
}
