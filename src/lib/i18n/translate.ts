// Client-safe. A dotted-key lookup with {placeholder} interpolation and a
// visible fallback (the key itself) when a string is missing.

export type TranslateVars = Record<string, string | number>;
export type Translator = (key: string, vars?: TranslateVars) => string;

function lookup(messages: unknown, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(messages: unknown): Translator {
  return (key, vars) => {
    const template = lookup(messages, key) ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) =>
      name in vars ? String(vars[name]) : `{${name}}`
    );
  };
}
