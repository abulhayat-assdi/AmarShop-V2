"use server";

import { signIn } from "@/lib/auth/config";

export async function authenticate(formData: FormData) {
  await signIn("credentials", {
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: "/",
  });
}
