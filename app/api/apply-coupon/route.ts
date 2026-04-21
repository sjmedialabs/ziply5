import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { applyCouponV2Schema } from "@/src/server/modules/commerce-extensions/coupons.validator"
import { applyCouponV2 } from "@/src/server/modules/commerce-extensions/coupons.service"

export async function POST(request: NextRequest) {
  const auth = optionalAuth(request)
  const body = await request.json()
  const parsed = applyCouponV2Schema.safeParse({
    ...body,
    userId: auth?.sub ?? body.userId ?? null,
  })
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const result = await applyCouponV2(parsed.data)
    return ok(result, "Coupon applied")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to apply coupon", 400)
  }
}
