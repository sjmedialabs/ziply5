import { NextRequest } from "next/server"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { fail, ok } from "@/src/server/core/http/response"
import { createOrderSchema } from "@/src/server/modules/orders/orders.validator"
import { createOrderFromCheckout } from "@/src/server/modules/orders/orders.service"

export async function POST(request: NextRequest) {
  const blocked = checkRateLimit(request, "orders:create", { limit: 15, windowMs: 60_000 })
  if (blocked) return blocked

  try {
    const user = optionalAuth(request)
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

    const userId = user?.role === "customer" ? user.sub : null
    const order = await createOrderFromCheckout({
      items: parsed.data.items,
      userId,
      shipping: parsed.data.shipping,
      currency: parsed.data.currency,
      couponCode: parsed.data.couponCode,
      gateway: parsed.data.gateway,
      billingAddress: parsed.data.billingAddress,
      paymentStatus: parsed.data.paymentStatus,
      paymentId: parsed.data.paymentId,
    })
    return ok(order, "Order created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
