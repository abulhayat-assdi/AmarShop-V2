"use server";

import { signIn } from "@/lib/auth/config";

// Only a same-origin, root-relative path is allowed as a post-login
// destination — never a protocol-relative ("//evil.com") or absolute URL.
function safeNext(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/dashboard";
  return v;
}

export async function authenticate(formData: FormData) {
  await signIn("credentials", {
    email: formData.get("email"),
    password: formData.get("password"),
    // The admin panel lives on the platform host (AUTH_URL) regardless of
    // which host the staff member started at — signIn()'s redirect resolves
    // relative to AUTH_URL, not the request's own Host header, so this
    // always lands on a real admin page there, not "/" (which is a
    // storefront homepage on a merchant's own subdomain, or a bare
    // marketing placeholder on the platform root — confusing either way
    // right after logging in).
    //
    // `next` carries a deep link through login — e.g. the /oauth/authorize
    // consent screen a merchant opened while logged out.
    redirectTo: safeNext(formData.get("next")),
  });
}
