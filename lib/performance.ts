import { logger } from "@/lib/logger"

export const measureAsync = async <T>(name: string, fn: () => Promise<T>, meta?: Record<string, unknown>): Promise<T> => {
  const startedAt = Date.now()
  try {
    const result = await fn()
    const elapsed = Date.now() - startedAt
    if (elapsed > 500) {
      logger.warn("perf.slow_operation", { name, elapsedMs: elapsed, ...meta })
    } else {
      logger.debug("perf.operation", { name, elapsedMs: elapsed, ...meta })
    }
    return result
  } catch (error) {
    logger.error("perf.operation_failed", {
      name,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown",
      ...meta,
    })
    throw error
  }
}

