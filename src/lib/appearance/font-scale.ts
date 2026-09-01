// Personal, per-browser admin UI text-size preference — localStorage, no
// DB column, same convention as admin-shell.tsx's nav-pin feature.
// Shared between AppearanceTab.tsx (the setting) and admin-shell.tsx
// (applying it on every admin page, not just /account).
export const FONT_SCALE_KEY = "amarshop_admin_font_scale";
export const FONT_SCALE_EVENT = "amarshop-admin-font-scale";
export const FONT_SCALES = ["normal", "large"] as const;
export type FontScale = (typeof FONT_SCALES)[number];

export function isFontScale(v: string): v is FontScale {
  return (FONT_SCALES as readonly string[]).includes(v);
}

export function subscribeFontScale(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(FONT_SCALE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FONT_SCALE_EVENT, onChange);
  };
}

export function fontScaleSnapshot(): FontScale {
  try {
    const v = localStorage.getItem(FONT_SCALE_KEY) ?? "normal";
    return isFontScale(v) ? v : "normal";
  } catch {
    return "normal";
  }
}

export const fontScaleServerSnapshot = (): FontScale => "normal";

export function applyFontScale(scale: FontScale) {
  document.documentElement.style.setProperty("font-size", scale === "large" ? "112.5%" : "");
}

export function setFontScale(scale: FontScale) {
  try {
    localStorage.setItem(FONT_SCALE_KEY, scale);
  } catch {
    /* private mode / disabled storage — the preference just won't persist */
  }
  applyFontScale(scale);
  window.dispatchEvent(new Event(FONT_SCALE_EVENT));
}
