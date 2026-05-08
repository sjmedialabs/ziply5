import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { safeSyncOrderShipmentToShiprocket } from "@/src/server/modules/shipping/shiprocket.orders"

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return fail("Not found", 404)
  const body = (await request.json().catch(() => ({}))) as { orderId?: string }
  if (!body.orderId?.trim()) return fail("orderId is required", 400)
  const data = await safeSyncOrderShipmentToShiprocket(body.orderId, "dev-test")
  return ok(data, "Shipment sync test completed")
}
