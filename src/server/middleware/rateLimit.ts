import { fail } from "@/src/server/core/http/response"

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const getIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  request.headers.get("x-real-ip")?.trim() ??
  "unknown"

export const checkRateLimit = (
  request: Request,
  keyPrefix: string,
  opts: { limit: number; windowMs: number },
) => {
  const now = Date.now()
  const key = `${keyPrefix}:${getIp(request)}`
  const cur = buckets.get(key)
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return null
  }
  if (cur.count >= opts.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((cur.resetAt - now) / 1000))
    return fail("Too many requests", 429, { retryAfterSec })
  }
  cur.count += 1
  buckets.set(key, cur)
  return null
}
