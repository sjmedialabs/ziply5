import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { getOrderForActor } from "@/src/server/modules/orders/orders.service"
import { syncShipmentTracking } from "@/src/server/modules/shipping/shiprocket.tracking"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden
  const { id } = await ctx.params
  const order = await getOrderForActor(id, auth.user.role, auth.user.sub)
  if (!order) return fail("Order not found", 404)
  try {
    const data = await syncShipmentTracking(id)
    return ok(data, "Tracking refreshed")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Tracking refresh failed", 400)
  }
}
