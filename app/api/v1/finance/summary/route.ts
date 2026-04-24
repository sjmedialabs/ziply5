import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { financeSummary } from "@/src/server/modules/extended/extended.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!(auth.user.role === "admin" || auth.user.role === "super_admin")) return fail("Forbidden", 403)
  const denied = requirePermission(auth.user.role, "finance.read")
  if (denied) return denied
  try {
    const data = await financeSummary()
    return ok(data, "Finance summary")
  } catch {
    return ok(
      {
        grossSales: 0,
        netRevenue: 0,
        orderCount: 0,
        refundsTotal: 0,
      },
      "Finance summary",
    )
  }
}
