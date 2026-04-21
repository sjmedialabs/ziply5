import { NextRequest } from "next/server"
import { z } from "zod"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { verifyRazorpayPayment } from "@/src/server/modules/payments/payments.service"

const schema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const denied = requirePermission(auth.user.role, "orders.read")
  if (denied) return denied

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  try {
    const result = await verifyRazorpayPayment({
      orderId: parsed.data.orderId,
      razorpayOrderId: parsed.data.razorpay_order_id,
      razorpayPaymentId: parsed.data.razorpay_payment_id,
      razorpaySignature: parsed.data.razorpay_signature,
    })
    return ok(result, "Payment verified")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Verification failed", 400)
  }
}
