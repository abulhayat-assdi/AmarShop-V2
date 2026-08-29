// Shared between proxy.ts (which sets it) and current.ts (which reads it) —
// kept dependency-free so proxy.ts doesn't have to import anything beyond
// what it needs to resolve a host.
export const STORE_ID_HEADER = "x-amarshop-store-id";

// Subdomains the platform keeps for itself. One list, two consumers: store
// creation refuses them as slugs, and host resolution never treats them as
// a storefront. These had drifted apart — a name reserved by one but not
// the other is a routing hole.
export const RESERVED_SUBDOMAINS = ["www", "app", "api", "admin", "platform"] as const;

export function isReservedSubdomain(sub: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(sub);
}
