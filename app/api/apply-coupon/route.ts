import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { applyCouponV2Schema } from "@/src/server/modules/commerce-extensions/coupons.validator"
import { calculateOffers } from "@/src/server/modules/offers/offers.service"

export async function POST(request: NextRequest) {
  const auth = optionalAuth(request)
  const body = await request.json()
  const parsed = applyCouponV2Schema.safeParse({
    ...body,
    userId: auth?.sub ?? body.userId ?? null,
  })
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const offers = await calculateOffers({
      userId: parsed.data.userId ?? null,
      couponCode: parsed.data.code,
      items: parsed.data.items.map((item) => ({
        productId: item.productId,
        categoryId: item.categoryId ?? null,
        quantity: item.quantity,
        unitPrice: 0,
      })),
      shippingAmount: 0,
      cartSubtotal: parsed.data.subtotal,
    })
    const couponDiscount = offers.breakdown
      .filter((entry) => entry.type === "coupon")
      .reduce((sum, entry) => sum + entry.amount, 0)
    return ok(
      {
        couponId: offers.breakdown.find((entry) => entry.type === "coupon")?.offerId ?? null,
        discount: couponDiscount,
        finalSubtotal: Math.max(parsed.data.subtotal - couponDiscount, 0),
        source: "offers_v2",
      },
      "Coupon applied",
    )
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to apply coupon", 400)
  }
}
