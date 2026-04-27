import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { calculateOffers } from "@/src/server/modules/offers/offers.service"
import { calculateOffersSchema } from "@/src/server/modules/offers/offers.validator"

export async function POST(request: NextRequest) {
  const auth = optionalAuth(request)
  const body = await request.json()
  const parsed = calculateOffersSchema.safeParse({
    ...body,
    userId: auth?.sub ?? body.userId ?? null,
  })
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  try {
    const result = await calculateOffers(parsed.data)
    return ok(result, "Offers calculated")
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to calculate offers", 400)
  }
}

