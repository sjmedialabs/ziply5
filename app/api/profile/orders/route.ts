import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { listOrders } from "@/src/server/modules/orders/orders.service"

/** Profile-friendly alias of GET /api/v1/orders (includes trackingSummary for customers). */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20")

  try {
    const data = await listOrders(page, limit, auth.user.role, auth.user.sub)
    return ok(data, "Orders fetched")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orders load failed"
    return fail(message, 500)
  }
}
