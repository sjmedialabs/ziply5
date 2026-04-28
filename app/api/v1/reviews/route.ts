import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import { optionalAuth } from "@/src/server/middleware/optionalAuth"
import { requirePermission } from "@/src/server/middleware/rbac"
import {
  createReview,
  listReviews,
} from "@/src/server/modules/extended/extended.service"
import { z } from "zod"

const createSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().optional(),
  userId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  content: z.string().optional(),
  body: z.string().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["published", "archived"]).optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
})

export async function GET(request: NextRequest) {
  const pub = request.nextUrl.searchParams.get("public")
  const productId = request.nextUrl.searchParams.get("productId") ?? undefined
  const orderId = request.nextUrl.searchParams.get("orderId") ?? undefined
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined
  if (pub === "1") {
    const rows = await listReviews({ status: "published", productId })
    return ok(rows, "Reviews")
  }

  const auth = requireAuth(request)
  if ("status" in auth) return auth
  const status = request.nextUrl.searchParams.get("status") ?? undefined
  const denied = requirePermission(auth.user.role, "reviews.read")
  if (denied) return denied
  const rows = await listReviews({ status, productId, orderId, userId })
  return ok(rows, "Reviews")
}

export async function POST(request: NextRequest) {
  const user = optionalAuth(request)
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())

  if (!user) {
    if (!parsed.data.guestEmail || !parsed.data.guestName) {
      return fail("guestName and guestEmail required when not logged in", 422)
    }
  } else {
    const denied = requirePermission(user.role, "reviews.create")
    if (denied) return denied
  }

  try {
    const row = await createReview({
      productId: parsed.data.productId,
      orderId: parsed.data.orderId,
      userId: user?.sub ?? parsed.data.userId,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.content ?? parsed.data.body,
      status: parsed.data.status ?? "published",
    })
    return ok(row, "Review submitted", 201)
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error", 400)
  }
}
