import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { validateCouponSchema } from "@/src/server/modules/coupons/coupons.validator"
import { computeCouponDiscount } from "@/src/server/modules/coupons/coupons.service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = validateCouponSchema.safeParse(body)
    if (!parsed.success) {
      return fail("Validation failed", 422, parsed.error.flatten())
    }

    const result = await computeCouponDiscount(parsed.data.code, parsed.data.subtotal)
    return ok(result, "Coupon valid")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid coupon"
    return fail(message, 400)
  }
}
