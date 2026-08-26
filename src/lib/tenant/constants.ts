// Shared between proxy.ts (which sets it) and current.ts (which reads it) —
// kept dependency-free so proxy.ts doesn't have to import anything beyond
// what it needs to resolve a host.
export const STORE_ID_HEADER = "x-amarshop-store-id";
