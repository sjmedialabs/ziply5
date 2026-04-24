import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { requirePermission } from "@/src/server/middleware/rbac"
import { createCouponSchema } from "@/src/server/modules/coupons/coupons.validator"
import { createCoupon, listCoupons } from "@/src/server/modules/coupons/coupons.service"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)

  console.log("Auth result:", auth) // Debug log
  if ("status" in auth) return auth
 
  const forbidden = requirePermission(auth.user.role, "coupons.read")
  if (forbidden) return forbidden

  const items = await listCoupons(auth.user.role)
  // console.log("Fetched coupons:", items) // Debug log
  return ok(items, "Coupons fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth

  const forbidden = requirePermission(auth.user.role, "coupons.create")
  if (forbidden) return forbidden

  const body = await request.json()
  //  console.log("Received body:", body) // Debug log
  const parsed = createCouponSchema.safeParse(body)

  // console.log("Validation result:", parsed) // Debug log
  if (!parsed.success) {
    return fail("Validation failed", 422, parsed.error.flatten())
  }

  // const { startsAt, endsAt, ...rest } = parsed.data
  const coupon = await createCoupon(
    parsed.data
  )

  return ok(coupon, "Coupon created", 201)
}
