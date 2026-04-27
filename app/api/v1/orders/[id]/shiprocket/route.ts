import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  assignAwbForOrderShipment,
  checkOrderServiceability,
  createShiprocketShipmentForOrder,
  generatePickupForOrderShipment,
  syncOrderToShiprocket,
} from "@/src/server/modules/integrations/shiprocket-order.service"
import { getShiprocketConfig } from "@/lib/integrations/shiprocket"

const schema = z.object({
  action: z.enum(["serviceability", "create_shipment", "assign_awb", "generate_pickup", "sync_order", "resync_order"]),
  generatePickup: z.boolean().optional(),
})

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden
  const { id } = await ctx.params
  try {
    const serviceability = await checkOrderServiceability(id)
    return ok(
      {
        orderId: id,
        mode: getShiprocketConfig().mode,
        availableCouriers: serviceability.response.available_couriers,
        weight: serviceability.weight,
      },
      "Serviceability fetched",
    )
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Serviceability check failed", 400)
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.update")
  if (forbidden) return forbidden
  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    if (parsed.data.action === "serviceability") {
      const data = await checkOrderServiceability(id)
      return ok(
        {
          mode: getShiprocketConfig().mode,
          availableCouriers: data.response.available_couriers,
          weight: data.weight,
        },
        "Serviceability checked",
      )
    }
    if (parsed.data.action === "create_shipment") {
      const data = await createShiprocketShipmentForOrder(id, auth.user.sub)
      return ok(data, "Shipment created")
    }
    if (parsed.data.action === "assign_awb") {
      const data = await assignAwbForOrderShipment(id, auth.user.sub)
      return ok(data, "AWB assigned")
    }
    if (parsed.data.action === "sync_order" || parsed.data.action === "resync_order") {
      const data = await syncOrderToShiprocket(id, auth.user.sub, { generatePickup: parsed.data.generatePickup !== false })
      return ok(data, parsed.data.action === "resync_order" ? "Order re-sync completed" : "Order sync completed")
    }
    const data = await generatePickupForOrderShipment(id, auth.user.sub)
    return ok(data, "Pickup generated")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Shiprocket action failed", 400)
  }
}
