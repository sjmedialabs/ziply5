import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { processShiprocketWebhook } from "@/src/server/modules/integrations/shiprocket.service"

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature =
    request.headers.get("x-shiprocket-signature") ??
    request.headers.get("x-webhook-signature")

  try {
    const result = await processShiprocketWebhook(payload, signature)
    return ok(result, "Shiprocket webhook processed")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Shiprocket webhook rejected", 401)
  }
}
