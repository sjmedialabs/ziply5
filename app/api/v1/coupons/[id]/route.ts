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
  const parsed = updateCouponSchema.safeParse(body)
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  const { startsAt, endsAt, ...rest } = parsed.data
  try {
    const coupon = await updateCoupon(id, {
      ...rest,
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
    })
    return ok(coupon, "Coupon updated")
  } catch {
    return fail("Coupon not found", 404)
  }
}
