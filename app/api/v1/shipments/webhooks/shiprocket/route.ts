import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { handleShiprocketWebhook } from "@/src/server/modules/shipping/shiprocket.webhooks"

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature =
    request.headers.get("x-shiprocket-signature") ??
    request.headers.get("x-webhook-signature")

  try {
    const result = await handleShiprocketWebhook(payload, signature)
    return ok(result, "Shiprocket webhook processed")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Shiprocket webhook rejected", 401)
  }
}
