import { NextRequest } from "next/server"
import { ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { reportSellerPerformance } from "@/src/server/modules/extended/extended.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "reports.read")
  if (denied) return denied
  const rows = await reportSellerPerformance()
  return ok(rows, "Platform performance")
}
