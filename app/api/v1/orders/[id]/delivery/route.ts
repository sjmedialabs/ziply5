import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { confirmDeliverySchema } from "@/src/server/modules/orders/orders.validator"
import { confirmOrderDelivery } from "@/src/server/modules/orders/orders.service"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const parsed = confirmDeliverySchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const order = await confirmOrderDelivery({
      orderId: id,
      actorId: auth.user.sub,
      shipmentId: parsed.data.shipmentId,
      note: parsed.data.note,
    })
    return ok(order, "Delivery confirmed")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery confirmation failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    if (message.toLowerCase().includes("invalid status transition")) return fail(message, 422)
    return fail(message, 400)
  }
}
