"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createApiKey, revokeApiKey } from "@/lib/api/keys";
import { parseScopes } from "@/lib/api/scopes";

export type ApiKeyCreateState = {
  error?: string;
  created?: { token: string; prefix: string };
};

export async function createApiKeyAction(
  _prev: ApiKeyCreateState,
  formData: FormData
): Promise<ApiKeyCreateState> {
  const session = await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "admin.apiKeys.errName" };

  const scopes = parseScopes(formData.getAll("scopes").map(String));
  if (scopes.length === 0) return { error: "admin.apiKeys.errScopes" };

  const created = await createApiKey(session.user.storeId, {
    name,
    scopes,
    staffId: session.user.id ?? null,
  });

  revalidatePath("/api-keys");
  return { created: { token: created.token, prefix: created.prefix } };
}

export async function revokeApiKeyAction(keyId: string) {
  const session = await requireRole("admin");
  await revokeApiKey(session.user.storeId, keyId);
  revalidatePath("/api-keys");
}
