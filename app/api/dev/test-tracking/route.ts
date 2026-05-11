import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { syncShipmentTracking } from "@/src/server/modules/shipping/shiprocket.tracking"

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return fail("Not found", 404)
  const body = (await request.json().catch(() => ({}))) as { orderId?: string }
  if (!body.orderId?.trim()) return fail("orderId is required", 400)
  try {
    const data = await syncShipmentTracking(body.orderId)
    return ok(data, "Tracking sync test completed")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Tracking sync failed", 400)
  }
}
