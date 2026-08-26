import Redis from "ioredis";

declare global {
  var __redis: Redis | undefined;
}

// Lazy for the same reason as src/db/client.ts — avoid throwing at module
// import time, which `next build` would hit while statically collecting
// page data, before any real REDIS_URL exists.
function getRedis(): Redis {
  if (globalThis.__redis) return globalThis.__redis;

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  const instance = new Redis(process.env.REDIS_URL);
  globalThis.__redis = instance;
  return instance;
}

export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const instance = getRedis();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
