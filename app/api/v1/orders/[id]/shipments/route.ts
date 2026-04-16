import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createShipmentSchema } from "@/src/server/modules/orders/orders.validator"
import { createOrderShipment, listOrderShipments } from "@/src/server/modules/orders/orders.service"

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  try {
    const shipments = await listOrderShipments(id)
    return ok(shipments, "Order shipments fetched")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = createShipmentSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  const { id } = await ctx.params
  try {
    const shipment = await createOrderShipment({
      orderId: id,
      actorId: auth.user.sub,
      shipmentNo: parsed.data.shipmentNo,
      carrier: parsed.data.carrier,
      trackingNo: parsed.data.trackingNo,
      itemAllocations: parsed.data.itemAllocations,
    })
    return ok(shipment, "Shipment created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed"
    if (message.toLowerCase().includes("not found")) return fail(message, 404)
    return fail(message, 400)
  }
}
