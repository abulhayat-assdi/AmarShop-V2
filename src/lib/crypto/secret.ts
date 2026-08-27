import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Symmetric encryption for third-party credentials stored in the DB
// (courier API keys, etc.). AES-256-GCM with a key from APP_SECRET_KEY
// (base64, 32 bytes — `openssl rand -base64 32`).
//
// If APP_SECRET_KEY is unset the value is stored as `plain:<base64>` and a
// one-time warning is logged — keeps local dev working without a key while
// making it obvious the value isn't protected. Production must set the key.

const CIPHER_PREFIX = "v1";
const PLAIN_PREFIX = "plain";

let warnedMissingKey = false;

function readKey(): Buffer | null {
  const raw = process.env.APP_SECRET_KEY;
  if (!raw) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[crypto] APP_SECRET_KEY is not set — stored secrets are NOT encrypted. Set it before production."
      );
    }
    return null;
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("APP_SECRET_KEY must decode to 32 bytes (base64 of `openssl rand -base64 32`).");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = readKey();
  if (!key) {
    return `${PLAIN_PREFIX}:${Buffer.from(plaintext, "utf8").toString("base64")}`;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CIPHER_PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

export function decryptSecret(ciphertext: string): string {
  if (ciphertext.startsWith(`${PLAIN_PREFIX}:`)) {
    return Buffer.from(ciphertext.slice(PLAIN_PREFIX.length + 1), "base64").toString("utf8");
  }
  const parts = ciphertext.split(":");
  if (parts.length !== 4 || parts[0] !== CIPHER_PREFIX) {
    throw new Error("Malformed secret ciphertext.");
  }
  const key = readKey();
  if (!key) {
    throw new Error("APP_SECRET_KEY is not set but a stored secret is encrypted.");
  }
  const [, iv, tag, data] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
