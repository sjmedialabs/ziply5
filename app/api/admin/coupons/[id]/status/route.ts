import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { setCouponStatusV2 } from "@/src/server/modules/commerce-extensions/coupons.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = (await request.json()) as { status?: boolean }
  if (typeof body.status !== "boolean") return fail("status boolean is required", 422)
  const { id } = await ctx.params
  await setCouponStatusV2(id, body.status)
  return ok({ id, status: body.status }, "Coupon status updated")
}
