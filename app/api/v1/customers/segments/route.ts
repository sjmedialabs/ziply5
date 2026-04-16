import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getCustomerSegmentation } from "@/src/server/modules/reports/enterprise-reports.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied =
    requirePermission(auth.user.role, "segments.read") ??
    requirePermission(auth.user.role, "customers.read")
  if (denied) return denied
  try {
    const rows = await getCustomerSegmentation()
    return ok(rows, "Customer segments fetched")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Segmentation failed", 400)
  }
}
