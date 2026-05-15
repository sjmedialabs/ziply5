import { NextRequest } from "next/server"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { fail, ok } from "@/src/server/core/http/response"
import { createOrderSchema } from "@/src/server/modules/orders/orders.validator"
import { createOrderFromCheckout } from "@/src/server/modules/orders/orders.service"

export async function GET() {
  return ok({ message: "Order creation endpoint is active" })
}

export async function POST(request: NextRequest) {
  console.log("POST /api/orders/create started")
  const blocked = checkRateLimit(request, "orders:create", { limit: 15, windowMs: 60_000 })
  if (blocked) return blocked
  console.log("Processing order creation request...")
  try {
    const user = optionalAuth(request)
    const body = await request.json()
    console.log("Request body:", body)
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
    const userId = user?.role === "customer" ? user.sub : null
  console.log("Parsed data:", parsed.data)
  console.log("Before createOrderFromCheckout")
    const order = await createOrderFromCheckout({
      items: parsed.data.items,
      userId,
      shipping: parsed.data.shippingCharge ?? parsed.data.shipping,
      currency: parsed.data.currency,
      couponCode: parsed.data.couponCode,
      appliedCouponId: parsed.data.couponId ?? parsed.data.appliedCouponId ?? null,
      gateway: parsed.data.gateway,
      subtotal: parsed.data.subtotal,
      discount: parsed.data.discount,
      tax: parsed.data.tax,
      total: parsed.data.total,
      billingAddress: parsed.data.billingAddress,
      paymentStatus: parsed.data.paymentStatus,
      paymentId: parsed.data.paymentId,
      sessionKey: parsed.data.sessionKey,
      totalItemsUsedForShipping: parsed.data.totalItemsUsedForShipping ?? null,
    })
    console.log("After createOrderFromCheckout")
    console.log("Order created successfully:", order)
    return ok(order, "Order created", 201)  
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    console.error("Error creating order:", {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return fail(message, 400)
  }
}
