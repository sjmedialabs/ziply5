import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { updateCouponV2Schema } from "@/src/server/modules/commerce-extensions/coupons.validator"
import {
  getCouponAnalyticsV2,
  softDeleteCouponV2,
  updateCouponV2,
} from "@/src/server/modules/commerce-extensions/coupons.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const { id } = await ctx.params
  const analytics = await getCouponAnalyticsV2(id)
  return ok(analytics, "Coupon analytics fetched")
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = updateCouponV2Schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    await updateCouponV2(id, parsed.data)
    return ok({ id }, "Coupon updated")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed", 400)
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const { id } = await ctx.params
  await softDeleteCouponV2(id)
  return ok({ id }, "Coupon deleted")
}
