import { fail, ok } from "@/src/server/core/http/response"
import { getShiprocketClientConfig } from "@/src/server/modules/shipping/shiprocket.service"
import { getShiprocketToken } from "@/lib/integrations/shiprocket"

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return fail("Not found", 404)
  }
  try {
    await getShiprocketToken()
    const config = getShiprocketClientConfig()
    return ok(
      {
        mode: config.mode,
        baseUrl: config.baseUrl,
        hasCredentials: config.hasCredentials,
        tokenCached: config.tokenCached,
      },
      "Shiprocket auth is working",
    )
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Shiprocket auth failed", 400)
  }
}
