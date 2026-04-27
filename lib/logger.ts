type LogLevel = "error" | "warn" | "info" | "debug"

const levelWeight: Record<LogLevel, number> = {
  error: 40,
  warn: 30,
  info: 20,
  debug: 10,
}

const resolveMinLevel = (): LogLevel => {
  if (process.env.NODE_ENV === "production") return "warn"
  if (process.env.DEBUG_MODE === "true") return "debug"
  const fromEnv = (process.env.LOG_LEVEL ?? "").toLowerCase()
  if (fromEnv === "error" || fromEnv === "warn" || fromEnv === "info" || fromEnv === "debug") return fromEnv
  return "info"
}

const minLevel = resolveMinLevel()

const shouldLog = (level: LogLevel) => levelWeight[level] >= levelWeight[minLevel]

const write = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  if (!shouldLog(level)) return
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  }
  if (level === "error") {
    console.error(JSON.stringify(payload))
    return
  }
  if (level === "warn") {
    console.warn(JSON.stringify(payload))
    return
  }
  if (level === "info") {
    console.info(JSON.stringify(payload))
    return
  }
  console.debug(JSON.stringify(payload))
}

export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
}

