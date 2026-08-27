import type { CourierProvider } from "./types";

// Client-safe metadata (labels + which credential fields each provider
// needs). The settings form renders from this; the adapters themselves are
// server-only.

export const COURIER_PROVIDERS: CourierProvider[] = ["steadfast", "pathao", "redx"];

export const COURIER_PROVIDER_LABELS: Record<CourierProvider, string> = {
  steadfast: "Steadfast",
  pathao: "Pathao",
  redx: "REDX",
};

export type CredentialField = {
  key: string;
  label: string;
  type: "text" | "password";
  optional?: boolean;
  hint?: string;
};

export const COURIER_CREDENTIAL_FIELDS: Record<CourierProvider, CredentialField[]> = {
  steadfast: [
    { key: "apiKey", label: "API Key", type: "password" },
    { key: "secretKey", label: "Secret Key", type: "password" },
    { key: "flatCharge", label: "Flat delivery charge (৳)", type: "text", optional: true },
  ],
  pathao: [
    { key: "clientId", label: "Client ID", type: "text" },
    { key: "clientSecret", label: "Client Secret", type: "password" },
    { key: "username", label: "Username (email)", type: "text" },
    { key: "password", label: "Password", type: "password" },
    { key: "storeId", label: "Store ID", type: "text" },
    { key: "defaultCityId", label: "Default City ID", type: "text", optional: true },
    { key: "defaultZoneId", label: "Default Zone ID", type: "text", optional: true },
    { key: "defaultAreaId", label: "Default Area ID", type: "text", optional: true },
  ],
  redx: [
    { key: "accessToken", label: "Access Token", type: "password" },
    { key: "defaultAreaId", label: "Default Area ID", type: "text", optional: true },
    { key: "defaultAreaName", label: "Default Area Name", type: "text", optional: true },
  ],
};
