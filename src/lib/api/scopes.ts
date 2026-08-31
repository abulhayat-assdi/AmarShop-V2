// The public API's permission scopes — the single source of truth for what
// a key may do (referenced by the key-mint UI, the DB write validation,
// and every /api/v1 route's guard). Slice 1 is read-only; write scopes
// (write:orders, …) land with the write endpoints.

export const API_SCOPES = ["read:products", "read:orders"] as const;

export type ApiScope = (typeof API_SCOPES)[number];

// i18n keys for each scope's human label — the single map shared by the
// API-keys screen and the OAuth consent screen. Client-safe (keys, not
// English), same convention as src/lib/enum-labels.ts.
export const SCOPE_LABEL_KEYS: Record<ApiScope, string> = {
  "read:products": "admin.apiKeys.scopeReadProducts",
  "read:orders": "admin.apiKeys.scopeReadOrders",
};

export function isValidScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}

// Parse the stored comma-joined `api_keys.scopes` (or a form submission)
// into a clean, de-duplicated list of known scopes.
export function parseScopes(input: string | string[]): ApiScope[] {
  const raw = Array.isArray(input) ? input : input.split(",");
  const out = new Set<ApiScope>();
  for (const s of raw) {
    const t = s.trim();
    if (isValidScope(t)) out.add(t);
  }
  return [...out];
}

export function serializeScopes(scopes: ApiScope[]): string {
  return [...new Set(scopes)].join(",");
}
