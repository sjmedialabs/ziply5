import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createOrderNoteSchema } from "@/src/server/modules/orders/orders.validator"
import { addOrderNote, getOrderForActor } from "@/src/server/modules/orders/orders.service"

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const order = await getOrderForActor(id, auth.user.role, auth.user.sub)
  if (!order) return fail("Order not found", 404)
  return ok(order.notes ?? [], "Order notes fetched")
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = createOrderNoteSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const note = await addOrderNote({
      orderId: id,
      note: parsed.data.note,
      isInternal: parsed.data.isInternal,
      actorId: auth.user.sub,
    })
    return ok(note, "Order note added", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Note create failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}
