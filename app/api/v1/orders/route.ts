import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"
import { createOrderSchema } from "@/src/server/modules/orders/orders.validator"
import { createOrderFromCheckout, listOrders } from "@/src/server/modules/orders/orders.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "orders.read")
  if (forbidden) return forbidden

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20")

  const data = await listOrders(page, limit, auth.user.role, auth.user.sub)
  return ok(data, "Orders fetched")
}

export async function POST(request: NextRequest) {
  const blocked = checkRateLimit(request, "orders:create", { limit: 15, windowMs: 60_000 })
  if (blocked) return blocked
  try {
    const user = optionalAuth(request)
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      return fail("Validation failed", 422, parsed.error.flatten())
    }

    const userId = user?.role === "customer" ? user.sub : null

    const order = await createOrderFromCheckout({
      items: parsed.data.items,
      userId,
      shipping: parsed.data.shipping,
      currency: parsed.data.currency,
      couponCode: parsed.data.couponCode,
      gateway: parsed.data.gateway,
    })

    return ok(order, "Order created", 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return fail(message, 400)
  }
}
