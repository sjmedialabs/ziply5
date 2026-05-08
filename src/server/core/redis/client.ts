import Redis from "ioredis"
import { env } from "@/src/server/core/config/env"

const globalForRedis = globalThis as unknown as { redis?: Redis }

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL || "redis://localhost:6379", {
    tls: env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
    password: env.REDIS_PASSWORD,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  })

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}

redis.on("error", (err) => {
  console.error("[Redis] Connection Error:", err)
})
