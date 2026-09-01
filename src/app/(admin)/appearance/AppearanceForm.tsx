"use client";

import { useActionState, useState } from "react";
import { useTranslator } from "@/components/i18n-provider";
import { removeStoreLogoAction, updateAppearanceAction, type AppearanceState } from "./actions";

const initialState: AppearanceState = {};

export function AppearanceForm({
  logoUrl,
  primaryColor,
  footerTagline,
  socialWhatsapp,
  socialFacebook,
  socialInstagram,
}: {
  logoUrl: string | null;
  primaryColor: string | null;
  footerTagline: string | null;
  socialWhatsapp: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateAppearanceAction, initialState);
  const t = useTranslator();
  const [color, setColor] = useState(primaryColor ?? "#000000");
  const [tagline, setTagline] = useState(footerTagline ?? "");
  const [whatsapp, setWhatsapp] = useState(socialWhatsapp ?? "");
  const [facebook, setFacebook] = useState(socialFacebook ?? "");
  const [instagram, setInstagram] = useState(socialInstagram ?? "");

  const field = "rounded border border-gray-300 px-3 py-2";

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-6">
      {state.error && (
        <p className="rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t(state.error)}
        </p>
      )}
      {state.ok && (
        <p className="rounded border border-green-400 bg-green-50 px-3 py-2 text-sm text-green-700">
          {t("admin.appearance.saved")}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{t("admin.appearance.logoTitle")}</h2>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- storefront-served upload, not a Next-optimizable static asset
          <img src={logoUrl} alt="" className="h-16 w-16 rounded border object-contain" />
        )}
        <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        <span className="text-xs text-gray-500">{t("admin.appearance.logoHint")}</span>
        {logoUrl && (
          <button
            type="button"
            onClick={() => removeStoreLogoAction()}
            className="self-start text-xs text-red-600 underline"
          >
            {t("admin.appearance.removeLogo")}
          </button>
        )}
      </section>

      <label className="flex flex-col gap-1 text-sm">
        {t("admin.appearance.colorLabel")}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000"}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-9 shrink-0 rounded border border-gray-300"
          />
          <input
            name="primaryColor"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#111827"
            className={`${field} font-mono`}
          />
        </div>
      </label>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("admin.appearance.footerTitle")}</h2>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.appearance.taglineLabel")}
          <input
            name="footerTagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.appearance.whatsappLabel")}
          <input
            name="socialWhatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="https://wa.me/8801XXXXXXXXX"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.appearance.facebookLabel")}
          <input
            name="socialFacebook"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="https://facebook.com/yourpage"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("admin.appearance.instagramLabel")}
          <input
            name="socialInstagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/yourpage"
            className={field}
          />
        </label>
      </section>

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
