import { NextRequest } from "next/server"
import { ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { reportTopProducts } from "@/src/server/modules/extended/extended.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "reports.read")
  if (denied) return denied
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20")
  const rows = await reportTopProducts(Number.isFinite(limit) ? limit : 20)
  return ok(rows, "Top products")
}
