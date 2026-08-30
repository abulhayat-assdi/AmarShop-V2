// Bangladeshi mobile number, local format: 01[3-9] + 8 digits (e.g.
// 017XXXXXXXX). Kept in its own client-safe module so client components
// (the checkout form's lead-capture gate) can import it without pulling in
// server-only code. src/lib/orders/create.ts re-exports it.
export const BD_PHONE_PATTERN = /^01[3-9]\d{8}$/;
