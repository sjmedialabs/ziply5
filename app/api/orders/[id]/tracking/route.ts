import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getOrderForActor } from "@/src/server/modules/orders/orders.service"
import { buildCustomerOrderTrackingPayload } from "@/src/server/modules/orders/order-tracking.service"

/** Same contract as GET /api/v1/orders/[id]/tracking (non-versioned alias). */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const order = await getOrderForActor(id, auth.user.role, auth.user.sub)
  if (!order) return fail("Order not found", 404)

  const refresh = request.nextUrl.searchParams.get("refresh") === "1"
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "80")
  const activitiesLimit = Number.isFinite(limitRaw) ? limitRaw : 80

  try {
    const data = await buildCustomerOrderTrackingPayload({
      orderId: id,
      order: order as any,
      refresh,
      activitiesLimit,
    })
    return ok(data, "Tracking loaded")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Tracking load failed", 400)
  }
}
