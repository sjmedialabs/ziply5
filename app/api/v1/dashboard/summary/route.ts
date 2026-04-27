import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getDashboardSummary } from "@/src/server/modules/dashboard/dashboard.service"
import { cacheKeys } from "@/lib/cache/cacheKeys"
import { withCache } from "@/lib/cache/redis"
import { measureAsync } from "@/lib/performance"

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if ("status" in auth) return auth

    const forbidden = requirePermission(auth.user.role, "dashboard.read")
    if (forbidden) return forbidden

    const summary = await measureAsync("api.dashboard.summary", () =>
      withCache(cacheKeys.dashboardSummary(auth.user.role), 60_000, () => getDashboardSummary()),
      { role: auth.user.role },
    )
    return ok({ scope: "admin", ...summary }, "Dashboard summary fetched")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard error"
    return fail(message, 503)
  }
}
