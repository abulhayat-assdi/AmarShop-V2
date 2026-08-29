import type { TranslateVars, Translator } from "./translate";

// A translatable message produced on the server and rendered on the
// client: Server Actions can't call the translator (no request locale in
// their return value), so they return the key + vars and the form resolves
// it. Keeps action-returned copy bilingual instead of hardcoded English.
export type MessageRef = { key: string; vars?: TranslateVars };

export function msg(key: string, vars?: TranslateVars): MessageRef {
  return vars ? { key, vars } : { key };
}

export function renderMessage(t: Translator, ref: MessageRef): string {
  return t(ref.key, ref.vars);
}
