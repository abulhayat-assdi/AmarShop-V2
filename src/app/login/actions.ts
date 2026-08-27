"use server";

import { signIn } from "@/lib/auth/config";

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
    redirectTo: "/orders",
  });
}
