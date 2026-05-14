import { randomUUID } from "node:crypto"
import { env } from "@/src/server/core/config/env"
import { logger } from "@/lib/logger"

const KEY_PREFIX = "shiprocket-sync:"
const DEFAULT_TTL_MS = 120_000

type MemEntry = { token: string; exp: number }
const memoryLocks = new Map<string, MemEntry>()

const pruneMemoryLocks = () => {
  const now = Date.now()
  for (const [k, v] of memoryLocks) {
    if (v.exp <= now) memoryLocks.delete(k)
  }
}

const tryMemoryLock = (orderId: string, token: string, ttlMs: number): boolean => {
  pruneMemoryLocks()
  const now = Date.now()
  const cur = memoryLocks.get(orderId)
  if (cur && cur.exp > now) return false
  memoryLocks.set(orderId, { token, exp: now + ttlMs })
  return true
}

const releaseMemoryLock = (orderId: string, token: string) => {
  const cur = memoryLocks.get(orderId)
  if (cur?.token === token) memoryLocks.delete(orderId)
}

/**
 * Exactly-once style orchestration per order: Redis SET NX when enabled, else in-process TTL lock.
 * Multi-instance deduplication requires Redis (REDIS_ENABLED=true + REDIS_URL).
 */
export async function withShiprocketOrderSyncLock<T>(orderId: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> {
  const token = randomUUID()
  const key = `${KEY_PREFIX}${orderId}`
  let backend: "redis" | "memory" | null = null

  const useRedis = env.REDIS_ENABLED === "true" && Boolean(env.REDIS_URL?.trim())

  if (useRedis) {
    try {
      const { redis } = await import("@/src/server/db/redis")
      const ok = await redis.set(key, token, "PX", ttlMs, "NX")
      if (ok !== "OK") {
        logger.info("shiprocket.sync.start", { orderId, skipped: true, reason: "lock_not_acquired", backend: "redis" })
        return null
      }
      backend = "redis"
      logger.info("shiprocket.lock.acquired", { orderId, backend: "redis", ttlMs })
    } catch (e) {
      logger.warn("shiprocket.lock.redis_unavailable", {
        orderId,
        reason: e instanceof Error ? e.message : "unknown",
      })
    }
  }

  if (!backend) {
    if (!tryMemoryLock(orderId, token, ttlMs)) {
      logger.info("shiprocket.sync.start", { orderId, skipped: true, reason: "lock_not_acquired", backend: "memory" })
      return null
    }
    backend = "memory"
    logger.info("shiprocket.lock.acquired", { orderId, backend: "memory", ttlMs })
  }

  try {
    return await fn()
  } finally {
    if (backend === "redis") {
      try {
        const { redis } = await import("@/src/server/db/redis")
        const script =
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end"
        await redis.eval(script, 1, key, token)
        logger.info("shiprocket.lock.released", { orderId, backend: "redis" })
      } catch (e) {
        logger.warn("shiprocket.lock.release_failed", {
          orderId,
          backend: "redis",
          reason: e instanceof Error ? e.message : "unknown",
        })
      }
    } else if (backend === "memory") {
      releaseMemoryLock(orderId, token)
      logger.info("shiprocket.lock.released", { orderId, backend: "memory" })
    }
  }
}

export { DEFAULT_TTL_MS as SHIPROCKET_SYNC_LOCK_TTL_MS }
