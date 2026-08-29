import { resolveCname, resolve4 } from "node:dns/promises";

// Custom-domain helpers: normalise merchant input, reject domains we must
// not accept, and prove the merchant controls the domain via its DNS.
// Pure except for the CUSTOM_DOMAIN_VERIFY_MODE escape hatch (below) — the
// DNS resolver is injectable so this is unit-testable without real DNS.
// The admin actions and the Caddy /ask endpoint are the only callers.

// RFC-1123-ish: 1+ labels then a 2–63 char alpha TLD, 253 chars max.
const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeCustomDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export type CustomDomainValidation = { ok: true } | { ok: false; reason: string };

export function validateCustomDomain(
  domain: string,
  platformRootDomain: string | undefined
): CustomDomainValidation {
  if (!domain) return { ok: false, reason: "Enter a domain." };
  if (domain === "localhost" || !HOSTNAME_RE.test(domain)) {
    return { ok: false, reason: "That doesn't look like a valid domain (e.g. shop.example.com)." };
  }
  if (platformRootDomain) {
    if (domain === platformRootDomain || domain.endsWith(`.${platformRootDomain}`)) {
      return {
        ok: false,
        reason: `${platformRootDomain} and its subdomains are managed by the platform — use your own domain.`,
      };
    }
  }
  return { ok: true };
}

export type DnsResolver = {
  resolveCname(hostname: string): Promise<string[]>;
  resolve4(hostname: string): Promise<string[]>;
};

const nodeDnsResolver: DnsResolver = { resolveCname, resolve4 };

export type DnsVerification = { ok: boolean; detail: string };

// Passes when the domain's CNAME points at the store's slug host (or the
// platform root), or — for apex domains / CNAME-flattened records — when
// its A records include a configured platform IP. CUSTOM_DOMAIN_VERIFY_MODE
// = "trust" skips the lookup entirely (local dev, where there's no real
// DNS for the test domain) with a warning — mirrors the `plain:` fallback
// in src/lib/crypto/secret.ts.
export async function verifyCustomDomainDns(
  domain: string,
  opts: {
    slugHost: string;
    platformRootDomain?: string;
    platformIps?: string[];
    resolver?: DnsResolver;
  }
): Promise<DnsVerification> {
  if (process.env.CUSTOM_DOMAIN_VERIFY_MODE === "trust") {
    console.warn(
      `[custom-domain] CUSTOM_DOMAIN_VERIFY_MODE=trust — skipping DNS check for ${domain}`
    );
    return { ok: true, detail: "verification skipped (trust mode)" };
  }

  const resolver = opts.resolver ?? nodeDnsResolver;
  const targets = [opts.slugHost, opts.platformRootDomain]
    .filter((t): t is string => !!t)
    .map((t) => t.toLowerCase());

  try {
    const cnames = await resolver.resolveCname(domain);
    const normalized = cnames.map((c) => c.toLowerCase().replace(/\.$/, ""));
    const hit = normalized.find((c) => targets.includes(c));
    if (hit) return { ok: true, detail: `CNAME → ${hit}` };
    if (normalized.length > 0) {
      return {
        ok: false,
        detail: `CNAME points to ${normalized.join(", ")} — expected ${targets.join(" or ")}`,
      };
    }
  } catch {
    // No CNAME record — fall through to the A-record check.
  }

  const platformIps = opts.platformIps ?? [];
  if (platformIps.length > 0) {
    try {
      const aRecords = await resolver.resolve4(domain);
      const hit = aRecords.find((ip) => platformIps.includes(ip));
      if (hit) return { ok: true, detail: `A record → ${hit}` };
      return {
        ok: false,
        detail: `A records (${aRecords.join(", ") || "none"}) don't include the platform IP`,
      };
    } catch {
      return { ok: false, detail: `No CNAME or A record found for ${domain}` };
    }
  }

  return {
    ok: false,
    detail: `${domain} has no CNAME to ${targets.join(" or ")}. Add that record and try again.`,
  };
}

export function platformIpsFromEnv(): string[] {
  return (process.env.PLATFORM_PUBLIC_IP ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Common second-level suffixes where the "real" apex has 3 labels
// (example.com.bd), so a naive "2 labels === apex" check is wrong.
const MULTI_LEVEL_SUFFIXES = [
  "com.bd",
  "net.bd",
  "org.bd",
  "edu.bd",
  "gov.bd",
  "ac.bd",
  "co.uk",
  "org.uk",
  "co.in",
];

// Best-effort: is `domain` a root/apex domain (example.com, example.com.bd)
// vs a subdomain (shop.example.com)? Only used to order the DNS-setup
// instructions — the verify step checks the actual records regardless.
export function isLikelyApex(domain: string): boolean {
  const labels = domain.split(".");
  const suffix = MULTI_LEVEL_SUFFIXES.find((s) => domain.endsWith(`.${s}`) || domain === s);
  return suffix ? labels.length === suffix.split(".").length + 1 : labels.length === 2;
}

export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };

export type DnsSetup = {
  likelyApex: boolean;
  // For connecting a root domain: A records for the apex and www.
  rootRecords: DnsRecord[];
  // For connecting a subdomain: one CNAME.
  subdomainRecord: DnsRecord | null;
};

// The concrete DNS records to show the merchant. `platformIp` is null until
// PLATFORM_PUBLIC_IP is set (no VPS yet) — then only the CNAME path can be
// spelled out. Called from the admin page (server); the client form just
// renders the returned rows.
export function dnsSetupFor(
  domain: string,
  opts: { slugHost: string | null; platformIp: string | null }
): DnsSetup {
  const labels = domain.split(".");
  const likelyApex = isLikelyApex(domain);
  const label = !likelyApex && labels.length > 2 ? labels[0] : "(your subdomain)";

  return {
    likelyApex,
    rootRecords: opts.platformIp
      ? [
          { type: "A", name: "@", value: opts.platformIp },
          { type: "A", name: "www", value: opts.platformIp },
        ]
      : [],
    subdomainRecord: opts.slugHost
      ? { type: "CNAME", name: label, value: opts.slugHost }
      : null,
  };
}
