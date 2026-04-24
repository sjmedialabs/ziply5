import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { updateCouponSchema } from "@/src/server/modules/coupons/coupons.validator"
import { updateCoupon } from "@/src/server/modules/coupons/coupons.service"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "coupons.update")
  if (forbidden) return forbidden

  const { id } = await ctx.params
  const body = await request.json() 
  console.log("Received body:", body) // Debug log
  const parsed = updateCouponSchema.safeParse(body)
  console.log("Validation result:", parsed) // Debug log
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  // const { startsAt, endsAt, ...rest } = parsed.data
  try {
    const coupon = await updateCoupon(id, parsed.data)
    return ok(coupon, "Coupon updated")
  } catch {
    return fail("Coupon not found", 404)
  }
}
