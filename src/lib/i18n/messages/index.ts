import type { Locale } from "../config";
import { en } from "./en";
import { bn } from "./bn";

// en.ts is the source of truth for the shape; bn.ts is checked against it.
export type Messages = typeof en;

export function messagesFor(locale: Locale): Messages {
  return locale === "bn" ? bn : en;
}
