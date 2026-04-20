import { Redis } from "ioredis"
import { env } from "@/src/server/core/config/env"

const globalForRedis = globalThis as unknown as {
  redis?: Redis
}

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    lazyConnect: true,

    //  REQUIRED for BullMQ workers
    maxRetriesPerRequest: null,

    enableReadyCheck: false,
  })

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
}