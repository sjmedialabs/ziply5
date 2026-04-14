import { Redis } from "ioredis"
import { env } from "@/src/server/core/config/env"

const globalForRedis = globalThis as unknown as {
  redis?: Redis
}

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  })

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}
