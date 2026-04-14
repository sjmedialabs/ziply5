import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getDashboardSummary, getSellerDashboardSummary } from "@/src/server/modules/dashboard/dashboard.service"

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if ("status" in auth) return auth

    const forbidden = requirePermission(auth.user.role, "dashboard.read")
    if (forbidden) return forbidden

    if (auth.user.role === "seller") {
      const summary = await getSellerDashboardSummary(auth.user.sub)
      return ok({ scope: "seller", ...summary }, "Dashboard summary fetched")
    }

    const summary = await getDashboardSummary()
    return ok({ scope: "admin", ...summary }, "Dashboard summary fetched")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard error"
    return fail(message, 503)
  }
}
