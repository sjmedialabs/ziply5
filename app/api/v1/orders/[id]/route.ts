import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { updateOrderStatusSchema } from "@/src/server/modules/orders/orders.validator"
import { getOrderForActor, updateOrderStatus } from "@/src/server/modules/orders/orders.service"

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const order = await getOrderForActor(id, auth.user.role, auth.user.sub)
  if (!order) return fail("Order not found", 404)
    console.log("Order fetched:", order)
  return ok(order, "Order fetched")
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = updateOrderStatusSchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  try {
    const order = await updateOrderStatus(id, parsed.data.status, auth.user.sub, {
      reasonCode: parsed.data.reasonCode,
      note: parsed.data.note,
    })
    return ok(order, "Order updated")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order update failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    if (message.toLowerCase().includes("invalid status transition")) return fail(message, 422)
    return fail(message, 400)
  }
}
