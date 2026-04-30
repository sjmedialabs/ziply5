import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { getRecoverableCartByTokenOrSession, trackCartEvent } from "@/src/server/modules/abandoned-carts/recovery.service"

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!token) return fail("Invalid token", 400)
  const cart = await getRecoverableCartByTokenOrSession(token)
  if (!cart) return fail("Recovery cart not found", 404)
  await trackCartEvent({
    sessionKey: cart.sessionKey,
    email: cart.email,
    itemsJson: cart.itemsJson,
    total: cart.total == null ? null : Number(cart.total),
    eventType: "checkout_started",
    meta: { source: "recovery_link" },
  })
  return ok(
    {
      sessionKey: cart.sessionKey,
      items: Array.isArray(cart.itemsJson) ? cart.itemsJson : [],
      total: cart.total == null ? null : Number(cart.total),
      email: cart.email,
    },
    "Recovery cart fetched",
  )
}

