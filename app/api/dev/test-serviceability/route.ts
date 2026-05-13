import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { getCourierOptions } from "@/src/server/modules/shipping/shiprocket.orders"

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return fail("Not found", 404)
  const orderId = request.nextUrl.searchParams.get("orderId")
  if (!orderId) return fail("orderId is required", 400)
  try {
    const data = await getCourierOptions(orderId)
    return ok(data, "Serviceability tested")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Serviceability test failed", 400)
  }
}
