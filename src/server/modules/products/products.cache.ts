import { env } from "@/src/server/core/config/env"
import { redis } from "@/src/server/db/redis"

const memoryStore = new Map<string, { at: number; value: string }>()
const PRODUCT_CACHE_PREFIX = "products:v1"

let redisReady = false
let redisInitAttemptedAt = 0
let redisErrorHandlerAttached = false

const ensureRedis = async () => {
  if (!env.REDIS_URL) return false
  if (!redisErrorHandlerAttached) {
    redis.on("error", () => {
      // keep product API healthy even if cache backend is down
    })
    redisErrorHandlerAttached = true
  }
  if (redisReady) return true
  if (Date.now() - redisInitAttemptedAt < 30_000) return false
  redisInitAttemptedAt = Date.now()
  try {
    if (redis.status !== "ready") {
      await redis.connect()
    }
    redisReady = true
    return true
  } catch {
    redisReady = false
    return false
  }
}

const now = () => Date.now()

const readMemory = <T>(key: string, ttlMs: number): T | null => {
  const row = memoryStore.get(key)
  if (!row) return null
  if (now() - row.at > ttlMs) {
    memoryStore.delete(key)
    return null
  }
  try {
    return JSON.parse(row.value) as T
  } catch {
    memoryStore.delete(key)
    return null
  }
}

const writeMemory = (key: string, value: unknown) => {
  memoryStore.set(key, { at: now(), value: JSON.stringify(value) })
}

export const getProductCache = async <T>(key: string, ttlMs: number): Promise<T | null> => {
  if (await ensureRedis()) {
    try {
      const value = await redis.get(key)
      return value ? (JSON.parse(value) as T) : null
    } catch {
      return readMemory<T>(key, ttlMs)
    }
  }
  return readMemory<T>(key, ttlMs)
}

export const setProductCache = async (key: string, value: unknown, ttlMs: number) => {
  if (await ensureRedis()) {
    try {
      await redis.set(key, JSON.stringify(value), "PX", ttlMs)
      return
    } catch {
      writeMemory(key, value)
      return
    }
  }
  writeMemory(key, value)
}

export const buildProductListCacheKey = (parts: Record<string, unknown>) =>
  `${PRODUCT_CACHE_PREFIX}:list:${JSON.stringify(parts)}`

export const buildProductBySlugCacheKey = (slug: string, scope: string) =>
  `${PRODUCT_CACHE_PREFIX}:slug:${scope}:${slug}`

export const invalidateProductCache = async () => {
  memoryStore.clear()
  if (await ensureRedis()) {
    try {
      const keys = await redis.keys(`${PRODUCT_CACHE_PREFIX}:*`)
      if (keys.length) {
        await redis.del(...keys)
      }
    } catch {
      // no-op: cache invalidation should not break writes
    }
  }
}
