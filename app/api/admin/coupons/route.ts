import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { createCouponV2Schema } from "@/src/server/modules/commerce-extensions/coupons.validator"
import { createCouponV2, listCouponsV2 } from "@/src/server/modules/commerce-extensions/coupons.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const items = await listCouponsV2()
  return ok(items, "Coupons fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = createCouponV2Schema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const id = await createCouponV2(parsed.data)
    return ok({ id }, "Coupon created", 201)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed", 400)
  }
}
