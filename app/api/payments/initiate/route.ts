import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { checkRateLimit } from "@/src/server/middleware/rateLimit"
import { createPaymentIntent } from "@/src/server/modules/payments/payments.service"

const schema = z.object({
  orderId: z.string().min(1),
  provider: z.enum(["razorpay", "stripe", "mock"]).optional(),
})

export async function POST(request: NextRequest) {
  const blocked = checkRateLimit(request, "payments:intent", { limit: 20, windowMs: 60_000 })
  if (blocked) return blocked

  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "orders.read")
  if (denied) return denied

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

    const intent = await createPaymentIntent({
      orderId: parsed.data.orderId,
      provider: parsed.data.provider,
      actorRole: auth.user.role,
      actorUserId: auth.user.sub,
    })
    return ok(intent, "Payment intent created")
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed", 400)
  }
}
