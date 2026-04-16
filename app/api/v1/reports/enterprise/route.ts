import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getCustomerSegmentation, getEnterpriseDashboard } from "@/src/server/modules/reports/enterprise-reports.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "reports.enterprise.read")
  if (denied) return denied

  const view = request.nextUrl.searchParams.get("view") ?? "dashboard"
  try {
    if (view === "segments") {
      const rows = await getCustomerSegmentation()
      return ok(rows, "Customer segmentation fetched")
    }
    const data = await getEnterpriseDashboard()
    return ok(data, "Enterprise report fetched")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Report failed", 400)
  }
}
