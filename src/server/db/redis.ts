import { Redis } from "ioredis"
import { env } from "@/src/server/core/config/env"

const globalForRedis = globalThis as unknown as {
  redis?: Redis
}

export const redis =
  globalForRedis.redis ??
  new Redis(
    (() => {
      const raw = env.REDIS_URL?.trim()
      if (!raw || raw === "/") return "redis://127.0.0.1:6379"
      try {
        const parsed = new URL(raw)
        if (parsed.protocol === "redis:" || parsed.protocol === "rediss:") return raw
      } catch {
        // fall back to local redis URL
      }
      return "redis://127.0.0.1:6379"
    })(),
    {
    lazyConnect: true,
    password: env.REDIS_PASSWORD,

    //  REQUIRED for BullMQ workers
    maxRetriesPerRequest: null,

    enableReadyCheck: false,
  })

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}