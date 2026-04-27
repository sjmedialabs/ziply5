import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { cache } from "@/lib/cache/redis"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!(auth.user.role === "admin" || auth.user.role === "super_admin")) return fail("Forbidden", 403)
  return ok(
    {
      cache: cache.metrics(),
      runtime: {
        nodeEnv: process.env.NODE_ENV ?? "unknown",
        debugMode: process.env.DEBUG_MODE === "true",
        redisEnabled: process.env.REDIS_ENABLED === "true",
      },
    },
    "Performance metrics",
  )
}

