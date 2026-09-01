"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslator } from "@/components/i18n-provider";
import { renderMessage } from "@/lib/i18n/message-ref";
import { PLANS, PLAN_IDS, type PlanId } from "@/lib/billing/plans";
import { RECOMMENDED_PLAN_ID } from "@/lib/marketing/constants";
import { signUp, type SignupField, type SignupState } from "./actions";

const initialState: SignupState = {};

// Two-panel signup (SITE_STRUCTURE.md Part A): plan radio cards on the
// left, the account form on the right, one <form> so the picked plan
// submits with it. Every field is controlled so React's post-action form
// reset doesn't wipe it (same reason as CreateStoreForm). Prices/limits
// come from src/lib/billing/plans.ts (rule #4).
export function SignupForm({ rootDomain }: { rootDomain: string }) {
  const t = useTranslator();
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  const [plan, setPlan] = useState<PlanId>(RECOMMENDED_PLAN_ID);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [storeType, setStoreType] = useState("ecommerce");
  const [locale, setLocale] = useState("bn");
  const [terms, setTerms] = useState(false);

  function errBorder(field: SignupField) {
    return state.field === field ? "border-red-500 focus:border-red-500" : "border-gray-300";
  }

  function planLimits(id: PlanId): string {
    const l = PLANS[id].limits;
    const one = (v: number | null, base: string) =>
      v === null ? t(`marketing.pricing.${base}Unlimited`) : t(`marketing.pricing.${base}`, { limit: v });
    return [
      one(l.products, "limitProducts"),
      one(l.staff, "limitStaff"),
      one(l.orders, "limitOrders"),
    ].join(" · ");
  }

  return (
    <form action={formAction} className="grid gap-8 md:grid-cols-[minmax(0,300px)_1fr]">
      {/* Left: plan selector */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">{t("marketing.signup.planHeading")}</legend>
        {PLAN_IDS.map((id: PlanId) => {
          const p = PLANS[id];
          const selected = plan === id;
          return (
            <label
              key={id}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 ${
                selected ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <input
                    type="radio"
                    name="plan"
                    value={id}
                    checked={selected}
                    onChange={() => setPlan(id)}
                  />
                  {t(p.nameKey)}
                </span>
                {id === RECOMMENDED_PLAN_ID && (
                  <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                    {t("marketing.pricing.recommended")}
                  </span>
                )}
              </span>
              <span className="text-sm">
                {p.monthlyPrice === 0
                  ? t("marketing.pricing.free")
                  : t("marketing.pricing.perMonth", { price: p.monthlyPrice.toLocaleString("en-US") })}
              </span>
              <span className="text-xs text-gray-500">{planLimits(id)}</span>
            </label>
          );
        })}
        <p className="text-xs text-gray-500">
          <Link href="/pricing" className="underline">
            {t("marketing.common.viewPricing")}
          </Link>
        </p>
      </fieldset>

      {/* Right: account + store form */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">{t("marketing.signup.formHeading")}</h2>

        {state.error && (
          <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
            {renderMessage(t, state.error)}
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.yourName")}
          <input
            name="ownerName"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={`rounded border px-3 py-2 ${errBorder("ownerName")}`}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.mobile")}
          <input
            name="ownerPhone"
            inputMode="numeric"
            placeholder="01XXXXXXXXX"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            className={`rounded border px-3 py-2 ${errBorder("ownerPhone")}`}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.email")}
          <input
            name="ownerEmail"
            type="email"
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className={`rounded border px-3 py-2 ${errBorder("ownerEmail")}`}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.password")}
          <input
            name="ownerPassword"
            type="password"
            required
            minLength={8}
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            className={`rounded border px-3 py-2 ${errBorder("ownerPassword")}`}
          />
          <span className="text-xs text-gray-500">{t("marketing.signup.passwordHint")}</span>
        </label>

        <hr className="border-gray-200" />

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.storeName")}
          <input
            name="storeName"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className={`rounded border px-3 py-2 ${errBorder("name")}`}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.subdomain")}
          <span className="flex items-center gap-1">
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={`w-full rounded border px-3 py-2 ${errBorder("slug")}`}
            />
            <span className="shrink-0 text-sm text-gray-500">.{rootDomain}</span>
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.sellWhat")}
          <select
            name="storeType"
            value={storeType}
            onChange={(e) => setStoreType(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="ecommerce">{t("marketing.signup.sellPhysical")}</option>
            <option value="digital">{t("marketing.signup.sellDigital")}</option>
          </select>
          <span className="text-xs text-gray-500">{t("marketing.signup.sellHint")}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("marketing.signup.language")}
          <select
            name="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="bn">বাংলা</option>
            <option value="en">English</option>
          </select>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className={`mt-1 ${state.field === "terms" ? "outline outline-red-500" : ""}`}
          />
          <span>{t("marketing.signup.terms")}</span>
        </label>
        <p className="text-xs text-gray-500">
          <Link href="/terms" className="underline">
            {t("marketing.footer.linkTerms")}
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline">
            {t("marketing.footer.linkPrivacy")}
          </Link>
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-black px-4 py-2.5 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? t("marketing.signup.submitting") : t("marketing.signup.submit")}
        </button>

        <p className="text-sm text-gray-500">
          {t("marketing.signup.haveAccount")}{" "}
          <Link href="/login" className="underline">
            {t("marketing.signup.signIn")}
          </Link>
        </p>
      </div>
    </form>
  );
}
