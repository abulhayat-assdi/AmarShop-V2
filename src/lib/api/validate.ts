// Small field validators shared by the /api/v1 write routes. Each returns
// a normalised value or `undefined` when the input is absent, and throws
// `BadField` (caught by the route → 400 bad_request) when it's present but
// invalid. Keeps every write handler's parsing terse and consistent.

export class BadField extends Error {}

export function bad(message: string): never {
  throw new BadField(message);
}

// A money amount as a canonical "123.45" string, matching how the DB
// stores numeric(12,2). Accepts a number or a numeric string; rejects
// negatives, NaN, and > 2 decimal places.
export function money(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") bad(`\`${field}\` must be a number.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) bad(`\`${field}\` must be a number of 0 or more.`);
  if (Math.round(n * 100) !== n * 100) bad(`\`${field}\` has more than 2 decimal places.`);
  return n.toFixed(2);
}

// A non-negative integer (stock quantity).
export function nonNegInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    bad(`\`${field}\` must be a whole number of 0 or more.`);
  }
  return value;
}

// A non-empty trimmed string, capped at `max` chars.
export function str(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim()) bad(`\`${field}\` must be a non-empty string.`);
  const s = value.trim();
  if (s.length > max) bad(`\`${field}\` is too long (max ${max}).`);
  return s;
}

// An optional trimmed string → string | null (an explicit null or "" clears it).
export function optStr(value: unknown, field: string, max = 2000): string | null {
  if (value == null || value === "") return null;
  return str(value, field, max);
}

// One value out of a known set.
export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    bad(`\`${field}\` must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}
