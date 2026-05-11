import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  assignShipmentAwb,
  createShiprocketShipment,
  debugSingleOrderShipment,
  generateShipmentPickup,
  getCourierOptions,
  retryShiprocketShipmentSync,
  repairShipmentState,
  safeSyncOrderShipmentToShiprocket,
} from "@/src/server/modules/shipping/shiprocket.orders"
import { syncShipmentTracking } from "@/src/server/modules/shipping/shiprocket.tracking"
import { getShiprocketClientConfig } from "@/src/server/modules/shipping/shiprocket.service"

const schema = z.object({
  action: z.enum([
    "serviceability",
    "create_shipment",
    "assign_awb",
    "generate_pickup",
    "sync_order",
    "resync_order",
    "retry_shipment_sync",
    "refresh_tracking",
    "regenerate_tracking_data",
    "debug_single_shipment",
    "repair_shipment_state",
  ]),
  generatePickup: z.boolean().optional(),
  forceResync: z.boolean().optional(),
})

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden
  const { id } = await ctx.params
  try {
    const serviceability = await getCourierOptions(id)
    return ok(
      {
        orderId: id,
        mode: getShiprocketClientConfig().mode,
        availableCouriers: serviceability.availableCouriers,
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
      const data = await getCourierOptions(id)
      return ok(
        {
          mode: getShiprocketClientConfig().mode,
          availableCouriers: data.availableCouriers,
          weight: data.weight,
        },
        "Serviceability checked",
      )
    }
    if (parsed.data.action === "create_shipment") {
      const data = await createShiprocketShipment(id, auth.user.sub)
      return ok(data, "Shipment created")
    }
    if (parsed.data.action === "assign_awb") {
      const data = await assignShipmentAwb(id, auth.user.sub)
      return ok(data, "AWB assigned")
    }
    if (parsed.data.action === "sync_order" || parsed.data.action === "resync_order" || parsed.data.action === "retry_shipment_sync") {
      const data =
        parsed.data.action === "retry_shipment_sync"
          ? await retryShiprocketShipmentSync(id, auth.user.sub)
          : await safeSyncOrderShipmentToShiprocket(id, auth.user.sub, {
              generatePickup: parsed.data.generatePickup !== false,
              forceResync: parsed.data.forceResync === true || parsed.data.action === "resync_order",
            })
      const normalized = {
        success: data.status !== "failed",
        orderId: id,
        shipmentId:
          (data as { created?: { extracted?: { shipmentId?: string | null } } }).created?.extracted?.shipmentId ??
          null,
        awbCode:
          (data as { awb?: { parsedAwb?: { awbCode?: string | null } } }).awb?.parsedAwb?.awbCode ?? null,
        courierName:
          (data as { awb?: { parsedAwb?: { courierName?: string | null } } }).awb?.parsedAwb?.courierName ?? null,
        trackingUrl:
          (data as { awb?: { parsedAwb?: { trackingUrl?: string | null } } }).awb?.parsedAwb?.trackingUrl ?? null,
        estimatedDeliveryDate: null,
        shippingStatus:
          (data as { awb?: { shipmentUpdated?: boolean } }).awb?.shipmentUpdated === true ? "AWB_ASSIGNED" : "PROCESSING",
        raw: data,
      }
      return ok(normalized, parsed.data.action === "resync_order" ? "Order re-sync completed" : "Order sync completed")
    }
    if (parsed.data.action === "repair_shipment_state") {
      const data = await repairShipmentState(id)
      if (data.success) return ok(data, "Shipment state repaired")
      return fail("Shipment state repair failed", 400, data)
    }
    if (parsed.data.action === "debug_single_shipment") {
      const data = await debugSingleOrderShipment(id, auth.user.sub)
      if (data.success) return ok(data, "Single-order Shiprocket debug completed")
      return fail("Shiprocket debug failed", 400, data)
    }
    if (parsed.data.action === "refresh_tracking" || parsed.data.action === "regenerate_tracking_data") {
      const data = await syncShipmentTracking(id)
      return ok(data, parsed.data.action === "regenerate_tracking_data" ? "Tracking data regenerated" : "Tracking refreshed")
    }
    const pickup = await generateShipmentPickup(id, auth.user.sub)
    return ok(pickup, "Pickup generated")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Shiprocket action failed", 400)
  }
}
