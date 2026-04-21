import { NextRequest } from "next/server"
import { fail, ok } from "@/src/server/core/http/response"
import { requireAuth } from "@/src/server/middleware/auth"
import {
  createProductDiscountSchema,
  updateProductDiscountSchema,
} from "@/src/server/modules/commerce-extensions/product-discounts.validator"
import {
  createProductDiscount,
  listProductDiscounts,
  updateProductDiscount,
} from "@/src/server/modules/commerce-extensions/product-discounts.service"

const ensureAdmin = (role: string) => role === "admin" || role === "super_admin"

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const productId = request.nextUrl.searchParams.get("productId") ?? undefined
  const items = await listProductDiscounts(productId)
  return ok(items, "Product discounts fetched")
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = await request.json()
  const parsed = createProductDiscountSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  const id = await createProductDiscount(parsed.data)
  return ok({ id }, "Product discount created", 201)
}

export async function PUT(request: NextRequest) {
  const auth = requireAuth(request)
  if ("status" in auth) return auth
  if (!ensureAdmin(auth.user.role)) return fail("Forbidden", 403)
  const body = (await request.json()) as { id?: string } & Record<string, unknown>
  if (!body.id) return fail("id is required", 422)
  const parsed = updateProductDiscountSchema.safeParse(body)
  if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten())
  await updateProductDiscount(String(body.id), parsed.data)
  return ok({ id: body.id }, "Product discount updated")
}
