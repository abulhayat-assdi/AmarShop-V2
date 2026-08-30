// Normalise a Bangladeshi mobile number to an MSISDN (8801XXXXXXXXX).
// Accepts "01712345678", "8801712345678", "+8801712345678" (and stray
// spaces/dashes). Throws on anything that isn't a BD mobile number.
export function toBdMsisdn(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+/, "");

  if (/^01[3-9]\d{8}$/.test(digits)) return `88${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return digits;

  throw new Error(`"${raw}" is not a valid Bangladeshi mobile number`);
}
